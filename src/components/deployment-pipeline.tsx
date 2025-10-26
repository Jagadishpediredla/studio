"use client";

import * as React from 'react';
import { Wand2, Cog, UploadCloud, ShieldCheck, ChevronRight, Loader, XCircle, CheckCircle2, Wifi, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStatus, PipelineStep } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeploymentPipelineProps {
  status: PipelineStatus;
  compilationStatus?: string[];
}

const stepConfig = {
  serverCheck: { label: "Server Check", icon: Wifi },
  codeGen: { label: "Code Gen", icon: Wand2 },
  compile: { label: "Compile", icon: Cog },
  upload: { label: "Upload", icon: UploadCloud },
  verify: { label: "Verify", icon: ShieldCheck },
} as const;

const statusConfig: { [key in PipelineStep]: { icon: React.ElementType, color: string, animation?: string } } = {
  pending: { icon: CheckCircle2, color: "text-muted-foreground/50" },
  processing: { icon: Loader, color: "text-yellow-400", animation: "animate-spin" },
  completed: { icon: CheckCircle2, color: "text-green-500" },
  failed: { icon: XCircle, color: "text-red-500" },
};

export default function DeploymentPipeline({ status, compilationStatus = [] }: DeploymentPipelineProps) {
  const steps = Object.keys(status) as Array<keyof PipelineStatus>;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current && compilationStatus.length > 0) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [compilationStatus]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2">
            {steps.map((stepKey, index) => {
            const stepKeyTyped = stepKey as keyof typeof stepConfig;
            const stepStatus = status[stepKeyTyped];
            const { icon: StepIcon } = stepConfig[stepKeyTyped];
            const statusKeyTyped = stepStatus as keyof typeof statusConfig;
            const { icon: StatusIcon, color, animation } = statusConfig[statusKeyTyped];

            return (
                <React.Fragment key={stepKey}>
                <Tooltip>
                    <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 sm:gap-2 cursor-default">
                        <StepIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">{stepConfig[stepKey].label}</span>
                        <StatusIcon className={cn("h-4 w-4 sm:h-5 sm:w-5", color, animation)} />
                    </div>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Status: {stepStatus.charAt(0).toUpperCase() + stepStatus.slice(1)}</p>
                    </TooltipContent>
                </Tooltip>
                {index < steps.length - 1 && (
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-border" />
                )}
                </React.Fragment>
            );
            })}
        </div>

        {compilationStatus.length > 0 && (
            <div className="bg-black/50 rounded-lg p-2 max-h-32">
                 <div className='flex items-center gap-2 text-sm font-medium text-muted-foreground p-1'>
                    <Terminal className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Compilation Status</span>
                 </div>
                 <ScrollArea className="h-20 w-full rounded-md border border-input bg-background/50 p-2">
                    <div ref={scrollRef} className="text-xs font-mono text-muted-foreground flex flex-col gap-1">
                        {compilationStatus.map((line, index) => (
                            <p key={index} className="truncate">{`> ${line}`}</p>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        )}
      </div>
    </TooltipProvider>
  );
}
