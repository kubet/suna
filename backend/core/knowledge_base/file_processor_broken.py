import os
import io
import uuid
import re
from typing import Dict, Any
from pathlib import Path
import mimetypes
import chardet

import PyPDF2
import docx

from core.utils.logger import logger
from core.services.supabase import DBConnection
from core.services.llm import make_llm_api_call

class FileProcessor:
    SUPPORTED_EXTENSIONS = {'.txt', '.pdf', '.docx'}
    MAX_FILE_SIZE = 50 * 1024 * 1024
    
    def __init__(self):
        self.db = DBConnection()
    
    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for S3 storage - remove/replace invalid characters."""
        # Keep the file extension
        name, ext = os.path.splitext(filename)
        
        # Replace emojis and other problematic Unicode characters with underscores
        name = re.sub(r'[^\w\s\-\.]', '_', name)
        
        # Replace spaces with underscores
        name = re.sub(r'\s+', '_', name)
        
        # Remove multiple consecutive underscores
        name = re.sub(r'_+', '_', name)
        
        # Remove leading/trailing underscores
        name = name.strip('_')
        
        # Ensure name is not empty
        if not name:
            name = 'file'
        
        return f"{name}{ext}"
    
    def _is_likely_text_file(self, file_content: bytes) -> bool:
        """Check if file content is likely text-based."""
        try:
            # Try to decode as text
            detected = chardet.detect(file_content[:1024])  # Check first 1KB
            if detected.get('confidence', 0) > 0.7:
                decoded = file_content[:1024].decode(detected.get('encoding', 'utf-8'))
                # Check if most characters are printable
                printable_ratio = len([c for c in decoded if c.isprintable() or c.isspace()]) / len(decoded)
                return printable_ratio > 0.8
        except:
            pass
        return False
    
    async def process_file(
        self, 
        account_id: str, 
        folder_id: str,
        file_content: bytes, 
        filename: str, 
        mime_type: str
    ) -> Dict[str, Any]:
        try:
            if len(file_content) > self.MAX_FILE_SIZE:
                raise ValueError(f"File too large: {len(file_content)} bytes")
            
            file_extension = Path(filename).suffix.lower()
            
            # Check if it's text-based first
            is_text_based = (
                mime_type.startswith('text/') or 
                mime_type in ['application/json', 'application/xml', 'text/xml'] or
                self._is_likely_text_file(file_content)
            )
            
            # If not text-based, check allowed extensions
            if not is_text_based and file_extension not in self.SUPPORTED_EXTENSIONS:
                raise ValueError(f"Unsupported file type: {file_extension}")
            
            # Generate unique entry ID
            entry_id = str(uuid.uuid4())
            
            # Sanitize filename for S3 storage
            sanitized_filename = self.sanitize_filename(filename)
            
            # Upload to S3
            s3_path = f"knowledge-base/{folder_id}/{entry_id}/{sanitized_filename}"
            client = await self.db.client
            
            await client.storage.from_('file-uploads').upload(
                s3_path, file_content, {"content-type": mime_type}
            )
            
            # Extract content for summary
            content = self._extract_content(file_content, filename, mime_type)
            if not content:
                # If no content could be extracted, create a basic file info summary
                content = f"File: {filename} ({len(file_content)} bytes, {mime_type})"
            
            # Generate LLM summary
            summary = await self._generate_summary(content, filename)
            
            # Save to database
            entry_data = {
                'entry_id': entry_id,
                'folder_id': folder_id,
                'account_id': account_id,
                'filename': filename,
                'file_path': s3_path,
                'file_size': len(file_content),
                'mime_type': mime_type,
                'summary': summary,
                'is_active': True
            }
            
            result = await client.table('knowledge_base_entries').insert(entry_data).execute()
            
            return {
                'success': True,
                'entry_id': entry_id,
                'filename': filename,
                'summary_length': len(summary)
            }
            
        except Exception as e:
            logger.error(f"Error processing file {filename}: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def _generate_summary(self, content: str, filename: str) -> str:
        """Generate LLM summary with proper token accounting and realistic limits."""
        try:
            # Real context limits (conservative, tested)
            models = [
                ("gpt-4o-mini", 120_000),  # Reliable, fast
                ("claude-3-haiku", 180_000),  # Good fallback
                ("gpt-3.5-turbo", 14_000)  # Emergency fallback
            ]
            
            # Proper token estimation (English text: ~0.75 tokens per char)
            estimated_tokens = int(len(content) * 0.75)
            
            for model_name, context_limit in models:
                try:
                    # Reserve tokens for prompt and response
                    usable_context = context_limit - 1000  # Reserve for prompt + response
                    
                    if estimated_tokens <= usable_context:
                        # Content fits, use full content
                        processed_content = content
                    else:
                        # Content too large, intelligent chunking
                        processed_content = self._smart_chunk_content(content, usable_context * 4)  # Convert back to chars
                    
                    prompt = f"""Create an ACTIONABLE brief that serves two purposes: (1) high-signal context to inject into an AI agent; (2) clear routing rules so the agent knows WHEN to query this file via semantic search. Do NOT infer beyond the file. If something isn’t present, write "None".
File: {filename}
Content:
{processed_content}

OUTPUT — PLAIN TEXT ONLY (no JSON/Markdown).
- Emit 1–5 CARDS if the file covers distinct topics/modules/features.
- Separate cards with a single line: ---
- Each card MUST follow the label order below, one line per label.
- For multi-item labels, separate items with "; " (semicolon + space).
- Keep identifiers exact (case/punctuation). Normalize dates to YYYY-MM-DD. Include units for numbers.
- Max ~180 words per card. No extra lines before the first label or after the last label.

Card: <1-based index>
Title: <5–9 words capturing this card’s scope>
Context: <2–4 sentences to inject verbatim: what this is; key capability; constraints>
Use If: <3–6 precise triggers (query intents, entities, conditions) that SHOULD route here>
Avoid If: <2–4 cases where this card SHOULD NOT be used>
Signals (Strict): <4–8 exact tokens/APIs/paths/IDs/error codes/config keys/tables>
Signals (Fuzzy): <6–12 synonyms/aliases/near-terms that often imply this topic>
Key Facts: <4–8 atomic facts with exact names/IDs/dates/versions/limits>
Inputs Needed: <required params/resources: IDs; roles/scopes; time ranges; files; env vars>
Actions: <concrete ops enabled: compute; look up; call API X; query table Y; transform; route>
Caveats: <constraints; edge conditions; rate limits; privacy/security notes; staleness>
Related: <adjacent tools/files/modules to check; exact names or paths>
Confidence: <High/Medium/Low — 1-line reason>

FINAL LINES (after all cards):
Cards: <number of cards emitted>
Index: <Card 1 Title>; <Card 2 Title>; <…>
GlobalUseIf: <3–6 cross-card triggers that most strongly indicate this file>
GlobalAvoidIf: <2–4 cross-card no-go cases (e.g., different product/version/domain)>
Validity: <date range or “Unknown”> ; Owner: <team/author if present>

QUALITY BAR:
- Prefer facts over prose; ignore boilerplate (ToC, headers, legal).
- Extract canonical terminology (functions/classes/APIs), config keys, file paths, schemas, error codes.
- Represent decision logic (preconditions/branches) as “Use If”/“Avoid If” signals.
- If many sections, choose the top 3–5 by impact (usage frequency, dependency weight, criticality).
- If homogeneous content, emit a single high-signal card."""


                    messages = [{"role": "user", "content": prompt}]
                    
                    response = await make_llm_api_call(
                        messages=messages,
                        model_name=model_name,
                        temperature=0.1,
                        max_tokens=800  # Realistic budget
                    )
                    
                    # Proper response parsing with validation
                    if hasattr(response, 'choices') and response.choices:
                        summary = response.choices[0].message.content.strip()
                    elif hasattr(response, 'content'):  # Handle different response formats
                        summary = response.content.strip()
                    else:
                        logger.error(f"Unexpected response format from {model_name}: {type(response)}")
                        continue
                    
                    # Validate the response has required sections
                    if summary and 'SUMMARY:' in summary and 'KEYWORDS:' in summary:
                        logger.info(f"Summary generated successfully using {model_name} ({len(summary)} chars)")
                        return summary
                    else:
                        logger.warning(f"Invalid format from {model_name}, trying next model")
                        continue
                        
                except Exception as e:
                    logger.warning(f"Model {model_name} failed: {str(e)}")
                    continue
            
            # All models failed - create structured fallback (not meta-garbage)
            logger.error("All LLM models failed, using structured fallback")
            return self._create_structured_fallback(content, filename)
            
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return self._create_structured_fallback(content, filename)
    
    def _semantic_chunk(self, content: str, max_tokens: int) -> str:
        """Intelligently chunk content by sections/headers, not random lines."""
        # Convert tokens back to chars (conservative: 1 token = 1.3 chars)
        max_chars = int(max_tokens * 1.3)
        
        if len(content) <= max_chars:
            return content
        
        lines = content.split('\n')
        
        # Find section headers (lines that look like titles/headers)
        sections = []
        current_section = []
        
        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current_section:
                    current_section.append(line)
                continue
                
            # Detect headers: ALL CAPS, short lines, starts with #, contains numbers like "1.", etc.
            is_header = (
                (len(stripped) < 80 and stripped.isupper()) or
                stripped.startswith('#') or
                (len(stripped) < 60 and any(c.isdigit() for c in stripped[:5])) or
                stripped.endswith(':') and len(stripped) < 50
            )
            
            if is_header and current_section:
                # Save previous section and start new one
                sections.append('\n'.join(current_section))
                current_section = [line]
            else:
                current_section.append(line)
        
        # Add final section
        if current_section:
            sections.append('\n'.join(current_section))
        
        # Select best sections to fit within limit
        if not sections:
            # Fallback: first 80% of content
            return content[:int(max_chars * 0.8)]
        
        selected = []
        current_length = 0
        
        # Always include first section (usually intro/overview)
        if sections:
            selected.append(sections[0])
            current_length = len(sections[0])
        
        # Add sections by priority: shorter ones first (likely key points)
        remaining_sections = sections[1:]
        remaining_sections.sort(key=len)
        
        for section in remaining_sections:
            if current_length + len(section) + 50 < max_chars:  # Leave buffer
                selected.append(section)
                current_length += len(section)
            else:
                break
        
        result = '\n\n'.join(selected)
        
        # If still too long, truncate last section
        if len(result) > max_chars:
            result = result[:max_chars-50] + "\n\n[Content truncated]"
        
        return result
    
    def _create_structured_fallback(self, content: str, filename: str) -> str:
        """Create structured fallback when LLM fails - extract actual signals."""
        lines = [line.strip() for line in content.split('\n') if line.strip()]
        
        # Extract meaningful tokens based on file type
        extension = Path(filename).suffix.lower()
        
        # Identify content patterns
        keywords = set()
        key_facts = []
        
        # Extract function names, class names, important identifiers
        import re
        
        if extension in ['.py', '.js', '.ts']:
            # Code files - extract functions, classes, imports
            patterns = [
                r'def\s+(\w+)',  # Python functions
                r'class\s+(\w+)',  # Classes
                r'function\s+(\w+)',  # JS functions
                r'const\s+(\w+)',  # Constants
                r'import\s+.*?(\w+)',  # Imports
            ]
            for pattern in patterns:
                keywords.update(re.findall(pattern, content, re.IGNORECASE))
        
        elif extension in ['.md', '.txt']:
            # Documentation - extract headers, key terms
            for line in lines[:50]:  # Check first 50 lines
                if line.startswith('#') or line.isupper() and len(line) < 80:
                    keywords.add(line.replace('#', '').strip())
        
        # Extract numbers, IDs, versions
        numbers = re.findall(r'\b\d+(?:\.\d+)*\b', content[:2000])
        if numbers:
            key_facts.append(f"Contains numeric values: {', '.join(numbers[:5])}")
        
        # File size and structure facts
        key_facts.extend([
            f"File size: {len(content):,} characters",
            f"Lines: {len(lines):,}",
            f"File type: {extension or 'unknown'}"
        ])
        
        # Extract first meaningful sentence as summary
        sentences = re.split(r'[.!?]+', content[:1000])
        meaningful_sentence = ""
        for sentence in sentences:
            clean = sentence.strip()
            if len(clean) > 20 and not clean.startswith(('import', 'from', '#', '//')):
                meaningful_sentence = clean
                break
        
        if not meaningful_sentence:
            meaningful_sentence = f"A {extension} file containing structured data and code"
        
        # Build structured response
        summary_parts = [
            f"SUMMARY: {meaningful_sentence}. This file contains {len(lines)} lines of content.",
            f"KEYWORDS: {', '.join(list(keywords)[:12]) if keywords else 'file, content, data, structure'}",
            f"USE_FOR: {filename} queries, file content search, structure analysis",
            f"AVOID_FOR: unrelated files, different file types, external content",
            f"KEY_FACTS: {'; '.join(key_facts[:6])}"
        ]
        
        return '\n'.join(summary_parts)
    
    def _extract_content(self, file_content: bytes, filename: str, mime_type: str) -> str:
        """Extract text content from file bytes."""
        file_extension = Path(filename).suffix.lower()
        
        try:
            # Handle text-based files (including JSON, XML, CSV, etc.)
            if (file_extension in ['.txt', '.json', '.xml', '.csv', '.yml', '.yaml', '.md', '.log', '.ini', '.cfg', '.conf'] 
                or mime_type.startswith('text/') 
                or mime_type in ['application/json', 'application/xml', 'text/xml']):
                
                detected = chardet.detect(file_content)
                encoding = detected.get('encoding', 'utf-8')
                try:
                    return file_content.decode(encoding)
                except UnicodeDecodeError:
                    return file_content.decode('utf-8', errors='replace')
            
            elif file_extension == '.pdf':
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
                return '\n\n'.join(page.extract_text() for page in pdf_reader.pages)
            
            elif file_extension == '.docx':
                doc = docx.Document(io.BytesIO(file_content))
                return '\n'.join(paragraph.text for paragraph in doc.paragraphs)
            
            # For any other file type, try to decode as text (fallback)
            else:
                try:
                    detected = chardet.detect(file_content)
                    encoding = detected.get('encoding', 'utf-8')
                    content = file_content.decode(encoding)
                    # Only return if it seems to be mostly text content
                    if len([c for c in content[:1000] if c.isprintable() or c.isspace()]) > 800:
                        return content
                except:
                    pass
                
                # If we can't extract text content, return a placeholder
                return f"[Binary file: {filename}] - Content cannot be extracted as text, but file is stored and available for download."
            
        except Exception as e:
            logger.error(f"Error extracting content from {filename}: {str(e)}")
            return f"[Error extracting content from {filename}] - File is stored but content extraction failed: {str(e)}" 