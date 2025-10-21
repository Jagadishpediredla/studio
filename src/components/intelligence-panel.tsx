"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { History, BookText, Share2, BrainCircuit, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "@/lib/types";

interface IntelligencePanelProps extends React.HTMLAttributes<HTMLDivElement> {
  visualizerCode: string;
  explanation: string;
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  sensorData: string;
  setSensorData: (data: string) => void;
  technicalReport: string;
  onGenerateReport: () => void;
  isAnalyzing: boolean;
}

export default function IntelligencePanel({
  visualizerCode,
  explanation,
  history,
  onRestore,
  sensorData,
  setSensorData,
  technicalReport,
  onGenerateReport,
  isAnalyzing,
  className,
  ...props
}: IntelligencePanelProps) {
  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <CardHeader>
        <CardTitle className="font-headline">Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow min-h-0">
        <Tabs defaultValue="explanation" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="explanation"><BookText className="w-4 h-4 mr-2"/>Explanation</TabsTrigger>
            <TabsTrigger value="visualizer"><Share2 className="w-4 h-4 mr-2"/>Visualizer</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-2"/>History</TabsTrigger>
            <TabsTrigger value="analysis"><BrainCircuit className="w-4 h-4 mr-2"/>Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="explanation" className="flex-grow min-h-0 mt-4">
            <ScrollArea className="h-full w-full rounded-md border p-4">
              <h3 className="font-bold mb-2">Code Explanation</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{explanation}</p>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="visualizer" className="flex-grow min-h-0 mt-4">
            <ScrollArea className="h-full w-full rounded-md border p-4">
              <h3 className="font-bold mb-2">Mermaid.js Flowchart</h3>
              <div className="bg-muted p-2 rounded-md">
                <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-code">{visualizerCode}</pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Render this code in a Mermaid.js compatible viewer.</p>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-grow min-h-0 mt-4">
            <ScrollArea className="h-full w-full rounded-md border">
              <Accordion type="single" collapsible className="w-full">
                {history.length > 0 ? history.map((item) => (
                  <AccordionItem value={item.id} key={item.id}>
                    <AccordionTrigger className="px-4 text-sm">
                      {item.timestamp.toLocaleString()}
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <pre className="text-xs bg-muted p-2 rounded-md max-h-40 overflow-auto font-code">{item.code}</pre>
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => onRestore(item)}>Restore</Button>
                    </AccordionContent>
                  </AccordionItem>
                )) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No history yet.</div>
                )}
              </Accordion>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analysis" className="flex-grow min-h-0 mt-4 flex flex-col gap-4">
              <div className="space-y-2">
                <h3 className="font-bold">Sensor Input</h3>
                <Textarea 
                  value={sensorData}
                  onChange={(e) => setSensorData(e.target.value)}
                  placeholder="Paste sensor data here..." 
                  className="h-24 font-code text-sm"
                  disabled={isAnalyzing}
                />
              </div>
              <Button onClick={onGenerateReport} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader className="w-4 h-4 mr-2 animate-spin"/> : <BrainCircuit className="w-4 h-4 mr-2" />}
                Generate Technical Analysis
              </Button>
              <ScrollArea className="flex-grow w-full rounded-md border p-4 min-h-0">
                <h3 className="font-bold mb-2">AI Generated Report</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {technicalReport || "Generated report will appear here."}
                </p>
              </ScrollArea>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
