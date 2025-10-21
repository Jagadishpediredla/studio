"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligencePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  visualizerHtml: string;
}

export default function IntelligencePanel({
  visualizerHtml,
  className,
  ...props
}: IntelligencePanelProps) {
  const iframeSrcDoc = `
    <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          /* Custom scrollbar for webkit browsers */
          ::-webkit-scrollbar {
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #1a202c; /* dark-bg */
          }
          ::-webkit-scrollbar-thumb {
            background: #4a5568; /* gray-600 */
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #718096; /* gray-500 */
          }
        </style>
      </head>
      ${visualizerHtml}
    </html>
  `;

  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            AI Visualizer
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow min-h-0 p-0">
        <iframe
          srcDoc={iframeSrcDoc}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="AI Generated Code Visualizer"
        />
      </CardContent>
    </Card>
  );
}
