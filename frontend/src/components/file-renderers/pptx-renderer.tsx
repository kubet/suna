'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Presentation,
    Download,
    ExternalLink,
    Loader2,
    AlertCircle
} from 'lucide-react';

interface PptxRendererProps {
    url: string;
    className?: string;
}

export function PptxRenderer({ url, className }: PptxRendererProps) {
    const [fileInfo, setFileInfo] = useState<{ size?: number; name?: string }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Construct Microsoft Office Online viewer URL
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'presentation.pptx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenExternal = () => {
        // Open the original file URL
        window.open(url, '_blank');
    };

    const getFileInfo = async () => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const size = response.headers.get('content-length');
            setFileInfo({
                size: size ? parseInt(size) : undefined,
                name: 'Presentation'
            });
        } catch (error) {
            console.log('Could not fetch file info:', error);
        }
    };

    useEffect(() => {
        if (url) {
            getFileInfo();
            // Set a timeout to hide loading state
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 3000); // 3 seconds timeout

            return () => clearTimeout(timer);
        }
    }, [url]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    return (
        <div className={cn('w-full h-full flex flex-col bg-background', className)}>
            {/* Content Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* Loading overlay */}
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                        <div className="text-center space-y-2">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading presentation...</p>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {hasError && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                        <div className="text-center space-y-4 max-w-md">
                            <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Preview Unavailable</h3>
                                <p className="text-muted-foreground mb-4">
                                    The presentation preview could not be loaded. This may happen with files from local sandboxes.
                                </p>
                                <div className="flex gap-2 justify-center">
                                    <Button onClick={handleDownload}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download PPTX
                                    </Button>
                                    <Button variant="outline" onClick={handleOpenExternal}>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open External
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Microsoft Office Online Viewer */}
                <iframe
                    src={officeViewerUrl}
                    title="PowerPoint Presentation"
                    className="w-full h-full border-0"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    sandbox="allow-same-origin allow-scripts allow-forms"
                    style={{ display: hasError ? 'none' : 'block' }}
                />
            </div>
        </div>
    );
}