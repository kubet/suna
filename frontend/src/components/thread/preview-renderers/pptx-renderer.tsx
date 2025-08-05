'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Presentation, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PptxRendererProps {
    url?: string;
    className?: string;
}

/**
 * Simple PPTX preview renderer for the file attachment grid
 * Shows basic info and action buttons - full viewer is in main file renderer
 */
export function PptxRenderer({
    url,
    className
}: PptxRendererProps) {
    const handleDownload = () => {
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'presentation.pptx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleOpenExternal = () => {
        if (url) {
            const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
            window.open(officeViewerUrl, '_blank');
        }
    };

    return (
        <div className={cn('w-full h-full flex flex-col items-center justify-center p-4 bg-muted/20', className)}>
            <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Presentation className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h4 className="text-sm font-medium text-foreground">PowerPoint</h4>
                    <p className="text-xs text-muted-foreground">Click to view presentation</p>
                </div>
                {url && (
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            className="text-xs h-7 px-2"
                        >
                            <Download className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenExternal}
                            className="text-xs h-7 px-2"
                        >
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}