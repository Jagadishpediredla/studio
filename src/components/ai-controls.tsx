"use client";

import type * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, Loader } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiControlsProps extends React.HTMLAttributes<HTMLDivElement> {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function AiControls({ prompt, setPrompt, onGenerate, isGenerating, className, ...props }: AiControlsProps) {
  return (
    <Card className={cn("shrink-0", className)} {...props}>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          AI Controls
        </CardTitle>
        <CardDescription>Describe the logic you want to build in plain English.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder='e.g., "Blink an LED on pin 13 every second"'
          className="min-h-[100px] text-base"
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
          Generate Code
        </Button>
      </CardContent>
    </Card>
  );
}
