"use client";

import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardInfo } from "@/lib/types";
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/ext-language_tools";


interface CodeEditorPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  onCodeChange: (code: string) => void;
  boardInfo: BoardInfo;
}

export default function CodeEditorPanel({ code, onCodeChange, boardInfo, className, ...props }: CodeEditorPanelProps) {
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
      <CardContent className="flex-grow min-h-0 p-0">
          <AceEditor
            mode="c_cpp"
            theme="tomorrow_night"
            onChange={onCodeChange}
            value={code}
            name="CODE_EDITOR"
            editorProps={{ $blockScrolling: true }}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: true,
              showLineNumbers: true,
              tabSize: 2,
            }}
            fontSize={16}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            width="100%"
            height="100%"
            className="font-code"
          />
      </CardContent>
    </Card>
  );
}
