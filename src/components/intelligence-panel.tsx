
"use client";

import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import type { StatusUpdate } from '@/lib/types';

interface IntelligencePanelProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  defaultTab: 'logs' | 'visualizer';
  visualizerHtml: string;
  compilationLogs: StatusUpdate[];
}

export default function IntelligencePanel({
  isOpen,
  onOpenChange,
  defaultTab,
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
          body { background-color: hsl(var(--background)); color: hsl(var(--foreground)); }
          :root {
            --background: 224 71.4% 4.1%;
            --foreground: 210 20% 98%;
          }
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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl w-full flex flex-col p-0" side="right">
        <div className="flex flex-col h-full bg-card">
            <Tabs defaultValue={defaultTab} className="flex-grow flex flex-col min-h-0">
                <SheetHeader className="p-4 border-b">
                   <SheetTitle>Intelligence Panel</SheetTitle>
                   <div className="flex items-center justify-end">
                      <TabsList>
                          <TabsTrigger value="logs"><Terminal className="mr-2"/>Logs</TabsTrigger>
                          <TabsTrigger value="visualizer"><BrainCircuit className="mr-2"/>Visualizer</TabsTrigger>
                      </TabsList>
                   </div>
                </SheetHeader>
                <TabsContent value="visualizer" className="flex-grow min-h-0 p-0 m-0">
                    <iframe
                        srcDoc={iframeSrcDoc}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                        title="AI Generated Code Visualizer"
                    />
                </TabsContent>
                <TabsContent value="logs" className="flex-grow min-h-0 m-0">
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
                </TabsContent>
            </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
