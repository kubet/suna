'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfRendererProps {
    url?: string;
    className?: string;
}

/**
 * Simple PDF preview renderer for the file attachment grid
 * Shows basic info and download button - full viewer is in main file renderer
 */
export function PdfRenderer({
    url,
    className
}: PdfRendererProps) {
    const handleDownload = () => {
        if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className={cn('w-full h-full flex flex-col items-center justify-center p-4 bg-muted/20', className)}>
            <div className="text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                    <h4 className="text-sm font-medium text-foreground">PDF Document</h4>
                    <p className="text-xs text-muted-foreground">Click to view full document</p>
                </div>
                {url && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="text-xs h-7"
                    >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                    </Button>
                )}
            </div>
        </div>
    );
}