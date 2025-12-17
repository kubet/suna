"""
Direct Agent Runner

Executes tests by calling start_agent_run() directly, bypassing HTTP and auth.
This provides the purest measurement of agent performance.
"""

import asyncio
import json
import time
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

from core.agent_runs import start_agent_run
from core.services.supabase import DBConnection
from core.services import redis
from core.utils.logger import logger
from core.utils.ensure_suna import ensure_suna_installed
from ..metrics import TestMetrics, TestResult, ToolCallRecord
from ..test_cases import TestCase


class DirectAgentRunner:
    """Executes tests via direct function calls"""
    
    def __init__(self, benchmark_account_id: Optional[str] = None):
        """
        Initialize direct runner.
        
        Args:
            benchmark_account_id: Account ID for test runs (created if None)
        """
        self.db = DBConnection()
        self.benchmark_account_id = benchmark_account_id
        self.agent_id: Optional[str] = None  # Will be set in initialize()
        self._cleanup_tasks: list[str] = []  # Thread IDs to clean up
    
    async def initialize(self):
        """Initialize runner and create benchmark account if needed"""
        await self.db.initialize()
        client = await self.db.client
        
        if not self.benchmark_account_id:
            # Create a benchmark test account with valid UUID
            self.benchmark_account_id = str(uuid.uuid4())
            logger.info(f"Creating benchmark account: {self.benchmark_account_id}")
            
            # Create the account record in the database
            try:
                await client.table('accounts').insert({
                    'id': self.benchmark_account_id,
                    'email': f'bench_{self.benchmark_account_id[:8]}@benchmark.local',
                    'created_at': datetime.now().isoformat(),
                }).execute()
                logger.info(f"Benchmark account created successfully")
            except Exception as e:
                logger.warning(f"Could not create account (might already exist): {e}")
        else:
            logger.info(f"Using provided account: {self.benchmark_account_id}")
        
        # Ensure default Suna agent exists for this account
        logger.info(f"Ensuring Suna agent is installed for benchmark account...")
        await ensure_suna_installed(self.benchmark_account_id)
        
        # Get the agent_id to use for all tests
        try:
            result = await client.table('agents').select('agent_id').eq(
                'account_id', self.benchmark_account_id
            ).eq('metadata->>is_suna_default', 'true').limit(1).execute()
            
            if result.data and len(result.data) > 0:
                self.agent_id = result.data[0]['agent_id']
                logger.info(f"Using Suna agent: {self.agent_id}")
            else:
                logger.warning("No Suna agent found, will use fallback")
                self.agent_id = None
        except Exception as e:
            logger.warning(f"Could not query for Suna agent: {e}, will use fallback")
            self.agent_id = None
    
    async def run_test(self, test: TestCase, model: str) -> TestResult:
        """
        Execute a test via direct agent invocation.
        
        Args:
            test: Test case to execute
            model: Model to use (kortix/basic or kortix/power)
        
        Returns:
            TestResult with metrics and output
        """
        logger.info(f"Running test #{test.id}: {test.name} with {model}")
        
        metrics = TestMetrics(
            model=model,
            test_id=test.id,
            test_name=test.name,
            started_at=datetime.now()
        )
        
        start_time = time.time()
        final_answer = ""
        thread_id = None
        agent_run_id = None
        
        try:
            # Start the agent run
            logger.debug(f"Calling start_agent_run for test {test.id}")
            
            result = await start_agent_run(
                account_id=self.benchmark_account_id,
                prompt=test.prompt,
                model_name=model,
                agent_id=self.agent_id,  # Use pre-fetched agent ID
                skip_limits_check=True,  # Bypass billing/rate limits
            )
            
            thread_id = result['thread_id']
            agent_run_id = result['agent_run_id']
            
            self._cleanup_tasks.append(thread_id)
            
            logger.debug(f"Agent run started: {agent_run_id}, thread: {thread_id}")
            
            # Stream results from Redis (120s default timeout)
            final_answer, metrics = await self._stream_and_collect_metrics(
                agent_run_id, thread_id, metrics, timeout=120
            )
            
        except Exception as e:
            logger.error(f"Test {test.id} failed: {e}", exc_info=True)
            metrics.finish_reason = "error"
            metrics.error_message = str(e)
            final_answer = f"Test failed with error: {str(e)}"
        
        end_time = time.time()
        metrics.total_time_seconds = end_time - start_time
        metrics.completed_at = datetime.now()
        
        # Create result
        result = TestResult(
            test_id=test.id,
            test_name=test.name,
            model=model,
            category=test.category,
            metrics=metrics,
            final_answer=final_answer,
            verdict="PENDING"  # Will be set by judge
        )
        
        return result
    
    async def _stream_and_collect_metrics(
        self,
        agent_run_id: str,
        thread_id: str,
        metrics: TestMetrics,
        timeout: int
    ) -> tuple[str, TestMetrics]:
        """
        Stream agent responses from Redis and collect metrics.
        
        Args:
            agent_run_id: Agent run ID
            thread_id: Thread ID
            metrics: Metrics object to populate
            timeout: Max time to wait (seconds)
        
        Returns:
            Tuple of (final_answer, metrics)
        """
        stream_key = f"agent_run:{agent_run_id}:stream"
        pubsub_channel = f"agent_run:{agent_run_id}:pubsub"
        
        final_answer = ""
        content_parts = []
        
        first_token_time = None
        last_message_time = time.time()
        stall_threshold = 2.0  # Consider a gap > 2s as a stall
        
        try:
            # Subscribe to pubsub for real-time updates
            pubsub = await redis.create_pubsub()
            await pubsub.subscribe(pubsub_channel)
            
            logger.debug(f"Subscribed to {pubsub_channel}")
            
            # Set timeout
            start_time = time.time()
            timeout_task = asyncio.create_task(asyncio.sleep(timeout))
            listen_task = asyncio.create_task(self._listen_to_stream(pubsub))
            
            done, pending = await asyncio.wait(
                [timeout_task, listen_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            # Cancel pending tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            # Process messages from listen task
            if listen_task in done:
                messages = await listen_task
                
                for message in messages:
                    current_time = time.time()
                    
                    # Check for stall
                    if last_message_time and (current_time - last_message_time) > stall_threshold:
                        metrics.stream_stall_count += 1
                        metrics.stream_stall_total_duration += (current_time - last_message_time)
                    
                    last_message_time = current_time
                    
                    # Parse message
                    if message.get('type') == 'content':
                        # First token timing
                        if first_token_time is None:
                            first_token_time = current_time
                            metrics.time_to_first_token = first_token_time - start_time
                        
                        content = message.get('content', '')
                        content_parts.append(content)
                    
                    elif message.get('type') == 'tool_call':
                        # Record tool call
                        tool_data = message.get('tool_call', {})
                        tool_name = tool_data.get('name', 'unknown')
                        
                        # We'll get the result later in tool_result message
                        # For now just note that a tool was called
                        logger.debug(f"Tool called: {tool_name}")
                    
                    elif message.get('type') == 'tool_result':
                        # Record tool execution
                        tool_data = message.get('tool_result', {})
                        tool_name = tool_data.get('tool_name', 'unknown')
                        success = not tool_data.get('error')
                        
                        # Estimate duration (we don't have exact start/end from stream)
                        duration = 1.0  # Placeholder
                        
                        tool_record = ToolCallRecord(
                            tool_name=tool_name,
                            args={},  # Not available in stream
                            start_time=current_time - duration,
                            end_time=current_time,
                            duration=duration,
                            success=success,
                            error=tool_data.get('error')
                        )
                        metrics.add_tool_call(tool_record)
                    
                    elif message.get('type') == 'status':
                        # Check for completion
                        status = message.get('status')
                        if status in ['completed', 'failed', 'stopped', 'error']:
                            metrics.finish_reason = status
                            
                            # Extract usage if available
                            usage = message.get('usage', {})
                            if usage:
                                metrics.set_token_usage(usage)
                                metrics.calculate_cost()
                            
                            break
            
            elif timeout_task in done:
                logger.warning(f"Test timed out after {timeout}s")
                metrics.finish_reason = "timeout"
            
            # Clean up pubsub
            await pubsub.unsubscribe(pubsub_channel)
            await pubsub.close()
            
            # Assemble final answer
            final_answer = ''.join(content_parts)
            
            # If no finish reason set, check run status in DB
            if metrics.finish_reason == "unknown":
                try:
                    client = await self.db.client
                    run_result = await client.table('agent_runs').select('status').eq('id', agent_run_id).single().execute()
                    if run_result.data:
                        metrics.finish_reason = run_result.data.get('status', 'unknown')
                except Exception as e:
                    logger.debug(f"Could not fetch run status: {e}")
            
        except Exception as e:
            logger.error(f"Error streaming results: {e}", exc_info=True)
            metrics.finish_reason = "error"
            metrics.error_message = str(e)
        
        return final_answer, metrics
    
    async def _listen_to_stream(self, pubsub) -> list[Dict[str, Any]]:
        """
        Listen to pubsub stream and collect messages.
        
        Returns:
            List of parsed messages
        """
        messages = []
        
        try:
            async for raw_message in pubsub.listen():
                if raw_message and raw_message.get('type') == 'message':
                    data = raw_message.get('data')
                    if isinstance(data, bytes):
                        data = data.decode('utf-8')
                    
                    try:
                        message = json.loads(data)
                        messages.append(message)
                        
                        # Stop on terminal status
                        if message.get('type') == 'status':
                            status = message.get('status')
                            if status in ['completed', 'failed', 'stopped', 'error']:
                                break
                    except json.JSONDecodeError:
                        logger.debug(f"Could not parse message: {data[:100]}")
        except asyncio.CancelledError:
            pass
        
        return messages
    
    async def cleanup(self):
        """Clean up test threads and data"""
        if not self._cleanup_tasks:
            return
        
        logger.info(f"Cleaning up {len(self._cleanup_tasks)} test threads")
        
        try:
            client = await self.db.client
            
            for thread_id in self._cleanup_tasks:
                try:
                    # Delete messages
                    await client.table('messages').delete().eq('thread_id', thread_id).execute()
                    
                    # Delete agent runs
                    await client.table('agent_runs').delete().eq('thread_id', thread_id).execute()
                    
                    # Delete thread
                    await client.table('threads').delete().eq('thread_id', thread_id).execute()
                    
                    logger.debug(f"Cleaned up thread {thread_id}")
                except Exception as e:
                    logger.warning(f"Failed to clean up thread {thread_id}: {e}")
            
            self._cleanup_tasks.clear()
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")

