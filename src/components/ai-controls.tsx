
"use client";

import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, Loader, Bot, User, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { CardHeader, CardContent } from './ui/card';

interface AiControlsProps {
  projectName: string;
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSendMessage: () => void;
  isGenerating: boolean;
  chatHistory: ChatMessage[];
  onManualCompile: () => void;
  statusIndicator: React.ReactNode;
}

export default function AiControls({ projectName, prompt, setPrompt, onSendMessage, isGenerating, chatHistory, onManualCompile, statusIndicator }: AiControlsProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatHistory]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
       <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
        <div className="flex items-center gap-4">
            <h1 className="text-lg font-headline font-bold text-foreground">{projectName}</h1>
            {statusIndicator}
        </div>
        <Button onClick={onManualCompile} disabled={isGenerating}>
          <Play className="mr-2 h-4 w-4"/>
          Compile & Run
        </Button>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 min-h-0 p-4">
        <ScrollArea className="flex-grow h-full pr-4 -mr-4">
            <div className="space-y-6" ref={scrollAreaRef as any}>
            {chatHistory.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-3 w-full", msg.role === 'user' ? 'flex-row-reverse' : '')}>
                {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                )}
                <div className={cn(
                    "rounded-lg p-3 max-w-[85%] text-sm",
                     "prose prose-sm prose-invert",
                    msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                 {msg.role === 'user' && (
                    <Avatar className="h-8 w-8">
                        <AvatarFallback><User className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                )}
                </div>
            ))}
             {isGenerating && chatHistory.length > 0 && chatHistory[chatHistory.length-1].role === 'user' && (
                <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg p-3 max-w-[85%] text-sm bg-muted flex items-center">
                        <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                </div>
            )}
            </div>
        </ScrollArea>
        <div className="relative">
            <Textarea
            placeholder='e.g., "Make the LED blink twice as fast."'
            className="min-h-[60px] text-base pr-12"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isGenerating}
            />
            <Button 
                onClick={onSendMessage} 
                disabled={isGenerating || !prompt} 
                className="absolute bottom-2.5 right-2.5"
                size="icon"
                variant="ghost"
            >
            {isGenerating ? (
                <Loader className="h-5 w-5 animate-spin" />
            ) : (
                <Wand2 className="h-5 w-5" />
            )}
            <span className="sr-only">Send Message</span>
            </Button>
        </div>
      </CardContent>
    </div>
  );
}
