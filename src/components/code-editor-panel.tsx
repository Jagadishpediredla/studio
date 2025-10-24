
"use client";

import * as React from 'react';
import { useRef, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Code, BookOpen } from "lucide-react";
import type { BoardInfo } from "@/lib/types";
import AceEditor from "react-ace";
import type { IAceEditor } from "react-ace/lib/types";

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
  boardInfo: BoardInfo;
}

export default function CodeEditorPanel({ code, onCodeChange, boardInfo }: CodeEditorPanelProps) {
  const editorRef = useRef<IAceEditor | null>(null);

  useEffect(() => {
    // On mount or when code changes, force the editor to resize.
    // This fixes the single-line rendering bug on large screens.
    if (editorRef.current) {
      editorRef.current.editor.resize();
    }
  }, [code]);

  return (
    <div className="flex flex-col h-full bg-card border-t">
      <header className="p-3 border-b flex items-center justify-between">
        <h2 className="font-headline text-base">Code</h2>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span>Board (FQBN):</span>
              <Badge variant="secondary">{boardInfo?.fqbn || '...'}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Libraries:</span>
              {boardInfo?.libraries && boardInfo.libraries.length > 0 ? (
                boardInfo.libraries.map(lib => <Badge key={lib} variant="secondary">{lib}</Badge>)
              ) : (
                <Badge variant="outline">None</Badge>
              )}
            </div>
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
              useWorker: true, // This is important for performance and some features
            }}
            fontSize={16}
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
