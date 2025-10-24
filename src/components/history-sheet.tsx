
"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { HistoryItem } from "@/lib/types"
import { Download, History, RotateCcw, Bot, FileCode, Loader } from "lucide-react"
import { Badge } from "./ui/badge"

interface HistorySheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onDownloadCode: (code: string, timestamp: Date) => void;
  onDownloadBinary: (buildId: string) => void;
  isGenerating: boolean;
}

export function HistorySheet({ isOpen, onOpenChange, history, onRestore, onDownloadCode, onDownloadBinary, isGenerating }: HistorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline flex items-center gap-2 text-2xl">
            <History />
            Version History
          </SheetTitle>
          <SheetDescription>
            Browse, restore, and download code and compiled binaries from previous versions.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full w-full pr-6">
            <Accordion type="single" collapsible className="w-full">
              {history.length > 0 ? history.map((item, index) => (
                <AccordionItem value={item.id} key={item.id}>
                  <AccordionTrigger className="text-base">
                    <div className="flex flex-col items-start text-left gap-1">
                       <span className="font-semibold">
                         {`Version ${history.length - index}: ${item.timestamp.toLocaleString()}`}
                       </span>
                       <span className="text-sm font-normal text-muted-foreground line-clamp-1">
                         Prompt: "{item.prompt}"
                       </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-2"><Bot /> AI Summary</h4>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{item.explanation}</p>
                    </div>
                    <div>
                       <h4 className="font-semibold mb-2">Build Details</h4>
                       <div className="flex gap-2 flex-wrap items-center">
                          <Badge variant="secondary">Board: {item.board.fqbn}</Badge>
                          {item.board.libraries.map(lib => <Badge key={lib} variant="outline">{lib}</Badge>)}
                          {item.binary && (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                               <FileCode className="mr-1.5 h-3 w-3" />
                               {item.binary.filename}
                            </Badge>
                          )}
                       </div>
                    </div>
                    <h4 className="font-semibold mb-2">Code Snapshot</h4>
                    <pre className="text-sm bg-black p-3 rounded-md max-h-60 overflow-auto font-code">{item.code}</pre>
                    
                    <div className="flex gap-2 pt-2">
                       <Button size="sm" variant="outline" onClick={() => onRestore(item)} disabled={isGenerating}>
                         <RotateCcw className="mr-2 h-4 w-4" />
                         Restore
                       </Button>
                       <Button size="sm" variant="outline" onClick={() => onDownloadCode(item.code, item.timestamp)} disabled={isGenerating}>
                         <Download className="mr-2 h-4 w-4" />
                         Download Code
                       </Button>
                       <Button size="sm" variant="secondary" onClick={() => onDownloadBinary(item.buildId!)} disabled={!item.buildId || isGenerating}>
                         {isGenerating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                         Download Binary
                       </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )) : (
                <div className="p-8 text-center text-muted-foreground">
                  No history yet. Generate new code to create a version snapshot.
                </div>
              )}
            </Accordion>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
