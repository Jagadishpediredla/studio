"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';

interface IntelligencePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  visualizerHtml: string;
  compilationLogs: string[];
}

export default function IntelligencePanel({
  visualizerHtml,
  compilationLogs,
  className,
  ...props
}: IntelligencePanelProps) {
  const logsEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [compilationLogs]);

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
        <Tabs defaultValue="visualizer" className="flex-grow flex flex-col min-h-0">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="font-headline flex items-center gap-2">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                        Intelligence
                    </CardTitle>
                    <TabsList>
                        <TabsTrigger value="visualizer">AI Visualizer</TabsTrigger>
                        <TabsTrigger value="logs">Logs</TabsTrigger>
                    </TabsList>
                </div>
            </CardHeader>
            <TabsContent value="visualizer" className="flex-grow min-h-0 p-0 m-0">
              <CardContent className="h-full p-0">
                <iframe
                    srcDoc={iframeSrcDoc}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title="AI Generated Code Visualizer"
                />
              </CardContent>
            </TabsContent>
            <TabsContent value="logs" className="flex-grow min-h-0 m-0">
               <CardContent className="h-full p-0">
                <ScrollArea className="h-full w-full">
                  <div className="p-4 font-code text-xs text-muted-foreground bg-black h-full">
                    {compilationLogs.map((log, index) => (
                      <p key={index} className="whitespace-pre-wrap leading-relaxed">&gt; {log}</p>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </ScrollArea>
               </CardContent>
            </TabsContent>
        </Tabs>
    </Card>
  );
}
