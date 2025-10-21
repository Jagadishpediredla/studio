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
import { Download, History, RotateCcw } from "lucide-react"

interface HistorySheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onDownload: (code: string, timestamp: Date) => void;
}

export function HistorySheet({ isOpen, onOpenChange, history, onRestore, onDownload }: HistorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline flex items-center gap-2 text-2xl">
            <History />
            Version History
          </SheetTitle>
          <SheetDescription>
            Browse and restore previous versions of your generated code.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full w-full pr-6">
            <Accordion type="single" collapsible className="w-full">
              {history.length > 0 ? history.map((item, index) => (
                <AccordionItem value={item.id} key={item.id}>
                  <AccordionTrigger className="text-base">
                    <div className="flex flex-col items-start text-left">
                       <span className="font-semibold">
                         {`Version ${history.length - index}: ${item.timestamp.toLocaleString()}`}
                       </span>
                       <span className="text-sm font-normal text-muted-foreground mt-1">
                         Prompt: "{item.prompt.length > 50 ? `${item.prompt.substring(0, 50)}...` : item.prompt}"
                       </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-sm bg-muted p-3 rounded-md max-h-60 overflow-auto font-code mb-4">{item.code}</pre>
                    <div className="flex gap-2">
                       <Button size="sm" variant="outline" onClick={() => onRestore(item)}>
                         <RotateCcw className="mr-2" />
                         Restore
                       </Button>
                       <Button size="sm" variant="outline" onClick={() => onDownload(item.code, item.timestamp)}>
                         <Download className="mr-2" />
                         Download
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
