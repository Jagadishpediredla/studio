
"use client";

import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, Loader, Bot, User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';

interface AiControlsProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onSendMessage: () => void;
  isGenerating: boolean;
  chatHistory: ChatMessage[];
}

export default function AiControls({ prompt, setPrompt, onSendMessage, isGenerating, chatHistory }: AiControlsProps) {
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
    <Card className="flex flex-col h-full border-0 shadow-none rounded-none">
      <CardHeader className="p-4 border-b">
        <CardTitle className="font-headline flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-primary" />
          AI Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col gap-4 min-h-0 p-4">
        <ScrollArea className="flex-grow h-full pr-4 -mr-4">
            <div className="space-y-6" ref={scrollAreaRef as any}>
            {chatHistory.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : '')}>
                {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                        <AvatarFallback><Bot className="h-5 w-5" /></AvatarFallback>
                    </Avatar>
                )}
                <div className={cn(
                    "rounded-lg p-3 max-w-[85%] text-sm",
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
            </div>
        </ScrollArea>
        <div className="relative">
            <Textarea
            placeholder='e.g., "Make the LED blink twice as fast."'
            className="min-h-[60px] text-sm pr-20"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isGenerating}
            />
            <Button 
                onClick={onSendMessage} 
                disabled={isGenerating || !prompt} 
                className="absolute bottom-2.5 right-2.5"
                size="icon"
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
    </Card>
  );
}
