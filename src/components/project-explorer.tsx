
"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TreeView, TreeViewItem } from "@/components/ui/tree-view";
import { File, Folder, Bot, LayoutGrid } from "lucide-react";

export default function ProjectExplorer() {
  return (
    <Card className="h-full flex flex-col border-0 shadow-none rounded-none">
      <CardHeader className="p-4 border-b">
        <CardTitle className="font-headline text-base flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Project Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 flex-grow">
        <ScrollArea className="h-full">
            <TreeView>
                <TreeViewItem value="project-root" label="esp32-blink-project">
                    <TreeViewItem value="src" label="src">
                        <TreeViewItem value="main-ino" label="main.ino" icon={<File className="h-4 w-4" />} />
                        <TreeViewItem value="utils" label="utils.h" icon={<File className="h-4 w-4" />} />
                    </TreeViewItem>
                     <TreeViewItem value="docs" label="docs">
                        <TreeViewItem value="readme" label="README.md" icon={<File className="h-4 w-4" />} />
                    </TreeViewItem>
                    <TreeViewItem value="config" label="platformio.ini" icon={<File className="h-4 w-4 text-orange-400" />} />
                     <TreeViewItem value="genkit" label="genkit.js" icon={<Bot className="h-4 w-4 text-green-400"/>} />
                </TreeViewItem>
            </TreeView>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
