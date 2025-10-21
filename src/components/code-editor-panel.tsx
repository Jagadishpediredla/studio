"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardInfo } from "@/lib/types";

interface CodeEditorPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  setCode: (code: string) => void;
  boardInfo: BoardInfo;
}

export default function CodeEditorPanel({ code, setCode, boardInfo, className, ...props }: CodeEditorPanelProps) {
  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <CardHeader>
        <CardTitle className="font-headline">Code Cockpit</CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span>Board (FQBN):</span>
              <Badge variant="secondary">{boardInfo.fqbn}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Libraries:</span>
              {boardInfo.libraries.length > 0 ? (
                boardInfo.libraries.map(lib => <Badge key={lib} variant="secondary">{lib}</Badge>)
              ) : (
                <Badge variant="outline">None</Badge>
              )}
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow min-h-0">
        <ScrollArea className="h-full w-full rounded-md border">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-full w-full font-code text-base !border-0 !ring-0 focus-visible:!ring-0 resize-none"
            placeholder="Generated code will appear here..."
          />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
