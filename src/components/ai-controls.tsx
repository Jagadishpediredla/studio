
"use client";

import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, Loader, Bot, User } from "lucide-react";
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
    <div className="flex flex-col h-full bg-card p-3 sm:p-4 gap-3 sm:gap-4">
        <ScrollArea className="flex-grow h-full pr-4 -mr-4">
            <div className="space-y-4 sm:space-y-6" ref={scrollAreaRef as any}>
            {chatHistory.map((msg, index) => (
                <div key={index} className={cn("flex items-start gap-2 sm:gap-3 w-full", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 bg-primary text-primary-foreground flex-shrink-0">
                        <AvatarFallback><Bot className="h-4 w-4 sm:h-5 sm:w-5" /></AvatarFallback>
                    </Avatar>
                )}
                <div className={cn(
                    "rounded-lg p-2 sm:p-3 max-w-[85%] text-xs sm:text-sm",
                     "prose prose-xs sm:prose-sm prose-invert",
                    msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                 {msg.role === 'user' && (
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                        <AvatarFallback><User className="h-4 w-4 sm:h-5 sm:w-5" /></AvatarFallback>
                    </Avatar>
                )}
                </div>
            ))}
             {isGenerating && chatHistory.length > 0 && chatHistory[chatHistory.length-1].role === 'user' && (
                <div className="flex items-start gap-2 sm:gap-3">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8 bg-primary text-primary-foreground flex-shrink-0">
                        <AvatarFallback><Bot className="h-4 w-4 sm:h-5 sm:w-5" /></AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg p-2 sm:p-3 max-w-[85%] text-xs sm:text-sm bg-muted flex items-center">
                        <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground" />
                    </div>
                </div>
            )}
            </div>
        </ScrollArea>
        <div className="relative">
            <Textarea
            placeholder='e.g., "Make the LED blink twice as fast."'
            className="min-h-[50px] sm:min-h-[60px] text-sm sm:text-base pr-10 sm:pr-12"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isGenerating}
            />
            <Button 
                onClick={onSendMessage} 
                disabled={isGenerating || !prompt} 
                className="absolute bottom-2 right-2 h-7 w-7 sm:bottom-2.5 sm:right-2.5 sm:h-8 sm:w-8"
                size="icon"
                variant="ghost"
            >
            {isGenerating ? (
                <Loader className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
                <Wand2 className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
            <span className="sr-only">Send Message</span>
            </Button>
        </div>
    </div>
  );
}
