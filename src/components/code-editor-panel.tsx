
"use client";

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Code, BookOpen, Download } from "lucide-react";
import type { BoardInfo } from "@/lib/types";
import AceEditor from "react-ace";
import type { IAceEditor } from "react-ace/lib/types";
import { Button } from './ui/button';

import ace from "ace-builds";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/ext-language_tools";

// Configure Ace to load workers from a CDN
ace.config.set(
  "basePath",
  "https://cdn.jsdelivr.net/npm/ace-builds@1.35.2/src-noconflict/"
);
ace.config.setModuleUrl(
  "ace/mode/c_cpp_worker",
  "https://cdn.jsdelivr.net/npm/ace-builds@1.35.2/src-noconflict/worker-c_cpp.js"
);


interface CodeEditorPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  onCodeChange: (code: string) => void;
  onDownloadCode: () => void;
  boardInfo: BoardInfo;
}

export default function CodeEditorPanel({ code, onCodeChange, onDownloadCode, boardInfo }: CodeEditorPanelProps) {
  const editorRef = useRef<IAceEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.editor.resize();
    }
  }, [code]);

  return (
    <div className="flex flex-col h-full bg-card border-l">
      <header className="p-2 sm:p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="font-headline text-sm sm:text-base">Code</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1 sm:gap-2">
              <Code className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Board (FQBN):</span>
              <Badge variant="secondary" className="text-xs">{boardInfo?.fqbn || '...'}</Badge>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Libraries:</span>
              {boardInfo?.libraries && boardInfo.libraries.length > 0 ? (
                boardInfo.libraries.map(lib => <Badge key={lib} variant="secondary" className="text-xs">{lib}</Badge>)
              ) : (
                <Badge variant="outline" className="text-xs">None</Badge>
              )}
            </div>
             <Button variant="outline" size="sm" className="h-7 text-xs sm:h-8 sm:text-sm px-2 sm:px-3" onClick={onDownloadCode}>
                <Download className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Download</span>
            </Button>
        </div>
      </header>
      <main className="flex-grow min-h-0">
          <AceEditor
            ref={editorRef as React.RefObject<AceEditor>}
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
              useWorker: true,
            }}
            fontSize={14}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
            width="100%"
            height="100%"
            className="font-code"
          />
      </main>
    </div>
  );
}
