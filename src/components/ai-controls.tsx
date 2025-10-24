
"use client";

import type * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, Loader, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from '@/lib/types';

interface AiControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  chatHistory: ChatMessage[];
}

export default function AiControls({ prompt, setPrompt, onGenerate, isGenerating, chatHistory, className, ...props }: AiControlsProps) {
  return (
    <Card className={cn("shrink-0", className)} {...props}>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          AI Chat
        </CardTitle>
        <CardDescription>Talk to the AI to build and modify your code.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* This will be replaced by a chat history view in the next step */}
        <div className="h-[120px] rounded-md border bg-muted p-2 text-sm text-muted-foreground italic">
          Chat history will appear here...
        </div>
        <Textarea
          placeholder='e.g., "Make the LED blink twice as fast."'
          className="min-h-[80px] text-base"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
        <Button onClick={onGenerate} disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <Loader className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Send Message
        </Button>
      </CardContent>
    </Card>
  );
}
