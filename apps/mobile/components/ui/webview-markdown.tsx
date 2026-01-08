/**
 * WebViewMarkdown Component
 * 
 * Renders markdown content in a WebView with:
 * - ✅ Perfect height calculation (HTML handles it)
 * - ✅ Native iOS text selection (built into WKWebView)
 * - ✅ Clickable links
 * - ✅ Full markdown support
 * - ✅ Theme matching (light/dark)
 * - ✅ Streaming support
 * 
 * Uses WebView instead of native TextInput to avoid all height calculation issues.
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextStyle,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import { useColorScheme } from 'nativewind';
import { useSelection } from '@/contexts/SelectionContext';

// Screen dimensions for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTENT_WIDTH = SCREEN_WIDTH - 32; // Account for padding

export interface WebViewMarkdownProps {
  /** The markdown text content to render */
  children: string;
  /** Additional style for the container */
  style?: TextStyle;
  /** Whether to use dark mode (if not provided, will use color scheme hook) */
  isDark?: boolean;
  /** Callback when a link is pressed */
  onLinkPress?: (url: string) => void;
  /** Callback when text selection state changes - use to disable parent scroll */
  onSelectionChange?: (isSelecting: boolean) => void;
}

/**
 * Simple markdown to HTML converter
 * Handles: bold, italic, strikethrough, headings, links, code, blockquotes, lists
 */
function markdownToHTML(markdown: string): string {
  let html = markdown;
  
  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks: ```lang\ncode\n```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="code-block"><code class="${lang}">${code}</code></pre>`;
  });
  
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Headings: # to ######
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (not inside bold)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\'link\',url:\'$2\'})); return false;">$1</a>');
  
  // Blockquotes: > text
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Unordered lists: - item or * item
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  
  // Ordered lists: 1. item
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Horizontal rules: --- or ***
  html = html.replace(/^(-{3,}|\*{3,})$/gm, '<hr />');
  
  // Paragraphs: wrap remaining text blocks
  html = html.split(/\n\n+/).map(block => {
    // Don't wrap already wrapped elements
    if (block.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr)/)) {
      return block;
    }
    // Wrap plain text in <p>
    if (block.trim() && !block.startsWith('<')) {
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    }
    return block;
  }).join('\n');
  
  // Line breaks in middle of paragraphs
  html = html.replace(/\n/g, '<br/>');
  
  return html;
}

/**
 * Generate CSS that matches the app's theme
 */
function generateCSS(isDark: boolean): string {
  const colors = isDark ? {
    text: '#fafafa',
    textMuted: '#a1a1aa',
    background: 'transparent',
    link: '#3b82f6',
    codeBg: '#27272a',
    codeText: '#fca5a5',
    blockquoteBorder: '#a1a1aa',
    hrColor: '#3f3f46',
  } : {
    text: '#18181b',
    textMuted: '#71717a',
    background: 'transparent',
    link: '#2563eb',
    codeBg: '#f4f4f5',
    codeText: '#dc2626',
    blockquoteBorder: '#71717a',
    hrColor: '#e4e4e7',
  };

  return `
    /* Load Roobert font from public URL */
    @font-face {
      font-family: 'Roobert';
      src: url('https://kortix.com/fonts/roobert/RoobertUprightsVF.woff2') format('woff2');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
    
    @font-face {
      font-family: 'Roobert';
      src: url('https://kortix.com/fonts/roobert/RoobertItalicsVF.woff2') format('woff2');
      font-weight: 100 900;
      font-style: italic;
      font-display: swap;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      /* Enable text selection on all elements */
      -webkit-user-select: text !important;
      -webkit-touch-callout: default !important;
      -webkit-tap-highlight-color: rgba(0, 122, 255, 0.2);
      user-select: text !important;
    }
    
    /* Selection highlight color */
    ::selection {
      background: rgba(0, 122, 255, 0.3);
    }
    ::-moz-selection {
      background: rgba(0, 122, 255, 0.3);
    }
    
    html, body {
      background: ${colors.background};
      font-family: 'Roobert', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-feature-settings: 'ss10' on, 'ss09' on, 'ss03' on, 'ss04' on, 'ss14' on;
      font-size: 16px;
      line-height: 1.5;
      color: ${colors.text};
      -webkit-text-size-adjust: none;
      /* iOS text selection - CRITICAL */
      -webkit-user-select: text !important;
      -webkit-touch-callout: default !important;
      user-select: text !important;
      cursor: text;
      /* Prevent scroll but allow selection gestures */
      overflow: hidden;
      height: 100%;
      position: relative;
      /* Disable pinch/double-tap zoom so double-tap can select text */
      touch-action: pan-x pan-y;
    }
    
    body {
      padding: 4px 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
      /* Ensure body allows selection */
      -webkit-user-select: text !important;
      user-select: text !important;
      /* Allow selection handles to show */
      overflow: visible !important;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      margin-top: 4px;
      margin-bottom: 2px;
      line-height: 1.35;
    }
    
    h1 { font-size: 26px; line-height: 36px; }
    h2 { font-size: 22px; line-height: 30px; }
    h3 { font-size: 18px; line-height: 26px; }
    h4 { font-size: 16px; }
    h5 { font-size: 15px; }
    h6 { font-size: 14px; color: ${colors.textMuted}; }
    
    p {
      margin-bottom: 0.5em;
    }
    
    p:last-child {
      margin-bottom: 0;
    }
    
    strong, b {
      font-weight: 600;
    }
    
    em, i {
      font-style: italic;
    }
    
    del, s {
      text-decoration: line-through;
      color: ${colors.textMuted};
    }
    
    a {
      color: ${colors.link};
      text-decoration: none;
    }
    
    a:active {
      opacity: 0.7;
    }
    
    .inline-code {
      font-family: 'Courier', monospace;
      font-size: 14px;
      color: ${colors.codeText};
      background: ${colors.codeBg};
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .code-block {
      font-family: 'Courier', monospace;
      font-size: 14px;
      background: ${colors.codeBg};
      padding: 10px;
      border-radius: 6px;
      margin: 4px 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .code-block code {
      color: ${isDark ? '#fafafa' : '#18181b'};
    }
    
    blockquote {
      border-left: 4px solid ${colors.blockquoteBorder};
      margin: 4px 0;
      padding-left: 12px;
      color: ${colors.textMuted};
    }
    
    ul, ol {
      margin: 4px 0;
      padding-left: 20px;
    }
    
    li {
      margin-bottom: 2px;
    }
    
    hr {
      border: none;
      border-top: 1px solid ${colors.hrColor};
      margin: 8px 0;
    }
    
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
  `;
}

/**
 * Generate full HTML document
 */
function generateHTML(markdown: string, isDark: boolean): string {
  const html = markdownToHTML(markdown);
  const css = generateCSS(isDark);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>${css}</style>
    </head>
    <body>
      ${html}
      <script>
        // Report height to React Native - use max of body and document
        function reportHeight() {
          const h = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: h }));
        }
        
        // Report on load
        reportHeight();
        window.addEventListener('load', reportHeight);
        
        // Use ResizeObserver for accurate height tracking
        if (typeof ResizeObserver !== 'undefined') {
          new ResizeObserver(reportHeight).observe(document.body);
        }
        
        // Fallback: MutationObserver for content changes (streaming)
        const observer = new MutationObserver(reportHeight);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        
        // iOS WebView text selection fix - toggle designMode to enable full selection
        document.designMode = 'on';
        setTimeout(function() {
          document.designMode = 'off';
        }, 100);
        
        // Also set selection styles explicitly
        document.documentElement.style.webkitUserSelect = 'text';
        document.documentElement.style.webkitTouchCallout = 'default';
        document.body.style.webkitUserSelect = 'text';
        document.body.style.webkitTouchCallout = 'default';
        
        // CRITICAL: Notify RN when selection is active so parent can disable scroll
        // This fixes the "can select word but can't drag handles" issue
        document.addEventListener('selectionchange', function() {
          var sel = window.getSelection ? window.getSelection().toString() : '';
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'selection', 
            active: sel.length > 0 
          }));
        });
        
        // Double-tap to select word (iOS sometimes needs help)
        // Use passive listener so scroll is not blocked
        var lastTap = 0;
        var lastTapX = 0;
        var lastTapY = 0;
        document.addEventListener('touchend', function(e) {
          var now = Date.now();
          var touch = e.changedTouches[0];
          var x = touch.clientX;
          var y = touch.clientY;
          
          // Check if double tap (within 300ms and 30px of last tap)
          var isDoubleTap = (now - lastTap < 300) && 
                            (Math.abs(x - lastTapX) < 30) && 
                            (Math.abs(y - lastTapY) < 30);
          
          if (isDoubleTap) {
            // Don't preventDefault - let scroll work normally
            // Just set the selection after a small delay
            setTimeout(function() {
              var range = document.caretRangeFromPoint(x, y);
              if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
                var sel = window.getSelection();
                sel.removeAllRanges();
                // Expand to word
                range.expand('word');
                sel.addRange(range);
              }
            }, 50);
          }
          
          lastTap = now;
          lastTapX = x;
          lastTapY = y;
        }, { passive: true });
      </script>
    </body>
    </html>
  `;
}

/**
 * Inject script to update content (for streaming)
 */
function getUpdateContentScript(markdown: string, isDark: boolean): string {
  const html = markdownToHTML(markdown);
  const escapedHtml = html.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  
  return `
    document.body.innerHTML = '${escapedHtml}';
    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', height: document.body.scrollHeight }));
    }, 10);
    true;
  `;
}

/**
 * WebView-based Markdown Renderer
 * 
 * Renders markdown in a WebView with perfect height calculation and native text selection.
 */
export function WebViewMarkdown({
  children,
  style,
  isDark: isDarkProp,
  onLinkPress,
  onSelectionChange,
}: WebViewMarkdownProps) {
  const { colorScheme } = useColorScheme();
  const isDark = isDarkProp ?? colorScheme === 'dark';
  const { setIsSelecting } = useSelection();
  
  const webViewRef = useRef<WebView>(null);
  const [height, setHeight] = useState(50); // Start with minimal height
  const [isLoading, setIsLoading] = useState(true);
  const lastContentRef = useRef<string>('');
  const hasInitializedRef = useRef(false);
  
  // Generate HTML source
  const htmlSource = useMemo(() => ({
    html: generateHTML(children, isDark),
  }), [isDark]); // Only regenerate on theme change, not content change for streaming
  
  // Initial HTML for first render
  const initialHtml = useMemo(() => generateHTML(children, isDark), [children, isDark]);
  
  // Update content via injection for streaming (faster than recreating WebView)
  useEffect(() => {
    if (webViewRef.current && hasInitializedRef.current && children !== lastContentRef.current) {
      const script = getUpdateContentScript(children, isDark);
      webViewRef.current.injectJavaScript(script);
      lastContentRef.current = children;
    }
  }, [children, isDark]);
  
  // Handle messages from WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'height') {
        setHeight(data.height);
        setIsLoading(false);
      } else if (data.type === 'link') {
        if (onLinkPress) {
          onLinkPress(data.url);
        } else {
          // Default: open in browser
          Linking.openURL(data.url).catch(err => {
            console.warn('Failed to open URL:', data.url, err);
          });
        }
      } else if (data.type === 'selection') {
        // CRITICAL: Notify parent when selection is active
        // Parent should disable ScrollView scrolling to allow handle dragging
        setIsSelecting(data.active);
        if (onSelectionChange) {
          onSelectionChange(data.active);
        }
      }
    } catch (e) {
      console.warn('[WebViewMarkdown] Failed to parse message:', e);
    }
  }, [onLinkPress, onSelectionChange, setIsSelecting]);
  
  // Handle WebView load complete
  const handleLoadEnd = useCallback(() => {
    hasInitializedRef.current = true;
    lastContentRef.current = children;
    setIsLoading(false);
  }, [children]);
  
  // Use FIXED height (not minHeight) - critical for FlatList/ScrollView to own scroll
  const containerHeight = Math.max(height, 28);
  
  return (
    <View 
      style={[styles.container, { height: containerHeight }, style]}
    >
      <WebView
        ref={webViewRef}
        source={{ html: initialHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        // Inject selection fix before content loads
        injectedJavaScriptBeforeContentLoaded={`
          document.addEventListener('DOMContentLoaded', function() {
            document.designMode = 'on';
            setTimeout(function() { document.designMode = 'off'; }, 50);
          });
          true;
        `}
        // Disable scroll - parent handles it
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        // iOS specific - enable text selection and interaction
        // IMPORTANT: allowsLinkPreview must be TRUE for text selection to work on iOS 13.4+!
        // textInteractionEnabled must be TRUE for text selection handles!
        allowsInlineMediaPlayback
        allowsLinkPreview={true}
        allowsBackForwardNavigationGestures={false}
        textInteractionEnabled={true}
        dataDetectorTypes="all"
        automaticallyAdjustContentInsets={false}
        contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
        // Android specific
        textZoom={100}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        // Performance
        cacheEnabled={false}
        incognito
        // Disable bounce but allow scroll (needed for selection)
        bounces={false}
        overScrollMode="never"
        // Don't intercept touches - let selection work
        nestedScrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // Don't use overflow: hidden - it clips selection handles!
    overflow: 'visible',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});

export default WebViewMarkdown;

