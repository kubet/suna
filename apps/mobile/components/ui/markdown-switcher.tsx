/**
 * Markdown Switcher Component
 * 
 * A wrapper that lets you easily switch between:
 * - WebViewMarkdown (new, WebView-based, perfect height)
 * - SelectableMarkdownText (current, native TextInput)
 * 
 * Usage:
 *   import { MarkdownText, setMarkdownMode } from '@/components/ui/markdown-switcher';
 * 
 *   // In your component:
 *   <MarkdownText>{markdownContent}</MarkdownText>
 * 
 *   // To switch modes (in dev):
 *   globalThis.setMarkdownMode('webview')  // or 'native'
 */

import React from 'react';
import { TextStyle } from 'react-native';
import { SelectableMarkdownText } from './selectable-markdown';
import { WebViewMarkdown } from './webview-markdown';

// Type of markdown renderer
type MarkdownMode = 'native' | 'webview';

// Current mode (can be changed at runtime for testing)
let currentMode: MarkdownMode = 'native'; // Default to native (current behavior)

/**
 * Set the markdown rendering mode
 * 
 * @param mode - 'native' for current TextInput-based, 'webview' for new WebView-based
 */
export function setMarkdownMode(mode: MarkdownMode) {
    currentMode = mode;
    console.log(`[MarkdownSwitcher] Mode set to: ${mode}`);
    console.log(`  - 'native': Current TextInput-based renderer (may have height issues)`);
    console.log(`  - 'webview': New WebView-based renderer (perfect height, text selection)`);
}

/**
 * Get the current markdown rendering mode
 */
export function getMarkdownMode(): MarkdownMode {
    return currentMode;
}

// Expose to global for easy console access in dev mode
if (__DEV__) {
    (globalThis as any).setMarkdownMode = setMarkdownMode;
    (globalThis as any).getMarkdownMode = getMarkdownMode;
    console.log('[MarkdownSwitcher] Test WebView markdown: globalThis.setMarkdownMode("webview")');
}

export interface MarkdownTextProps {
    /** The markdown text content to render */
    children: string;
    /** Additional style for the container */
    style?: TextStyle;
    /** Whether to use dark mode (if not provided, will use color scheme hook) */
    isDark?: boolean;
    /** Callback when a link is pressed (WebView mode only) */
    onLinkPress?: (url: string) => void;
}

/**
 * Unified Markdown Text Component
 * 
 * Renders markdown using either native TextInput or WebView based on current mode.
 * Switch modes at runtime with globalThis.setMarkdownMode('webview' | 'native')
 */
export function MarkdownText({
    children,
    style,
    isDark,
    onLinkPress,
}: MarkdownTextProps) {
    if (currentMode === 'webview') {
        return (
            <WebViewMarkdown
                style={style}
                isDark={isDark}
                onLinkPress={onLinkPress}
            >
                {children}
            </WebViewMarkdown>
        );
    }

    // Default: native mode
    return (
        <SelectableMarkdownText style={style} isDark={isDark}>
            {children}
        </SelectableMarkdownText>
    );
}

// Also export individual components for direct use
export { SelectableMarkdownText } from './selectable-markdown';
export { WebViewMarkdown } from './webview-markdown';

