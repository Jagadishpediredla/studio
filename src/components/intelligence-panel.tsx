
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import type { StatusUpdate } from '@/lib/types';

interface IntelligencePanelProps {
  visualizerHtml: string;
  compilationLogs: StatusUpdate[];
}

export default function IntelligencePanel({
  visualizerHtml,
  compilationLogs,
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
  
  const getLogColor = (type: StatusUpdate['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  }

  return (
    <Card className="flex flex-col h-full border-0 shadow-none rounded-none">
        <Tabs defaultValue="logs" className="flex-grow flex flex-col min-h-0">
            <CardHeader className="p-0">
                <div className="flex items-center justify-between p-4 border-b">
                    <TabsList>
                        <TabsTrigger value="logs"><Terminal className="mr-2"/>Logs</TabsTrigger>
                        <TabsTrigger value="visualizer"><BrainCircuit className="mr-2"/>AI Visualizer</TabsTrigger>
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
                  <div className="p-4 font-code text-xs bg-black h-full">
                    {compilationLogs.length === 0 && <div className="text-muted-foreground">&gt; Awaiting logs...</div>}
                    {compilationLogs.map((log, index) => (
                      <div key={index} className={cn("whitespace-pre-wrap leading-relaxed", getLogColor(log.type))}>
                        <span className="text-gray-500 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        &gt; {log.message}
                      </div>
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
