"use client";

import * as React from 'react';
import { Wand2, Cog, UploadCloud, ShieldCheck, ChevronRight, Loader, XCircle, CheckCircle2, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStatus, PipelineStep } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DeploymentPipelineProps {
  status: PipelineStatus;
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

export default function DeploymentPipeline({ status }: DeploymentPipelineProps) {
  const steps = Object.keys(status) as Array<keyof PipelineStatus>;

  return (
    <TooltipProvider>
        <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
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
                    <div className="flex items-center gap-2 cursor-default">
                        <StepIcon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">{stepConfig[stepKey].label}</span>
                        <StatusIcon className={cn("h-5 w-5", color, animation)} />
                    </div>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>Status: {stepStatus.charAt(0).toUpperCase() + stepStatus.slice(1)}</p>
                    </TooltipContent>
                </Tooltip>
                {index < steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-border" />
                )}
                </React.Fragment>
            );
            })}
        </div>
    </TooltipProvider>
  );
}
