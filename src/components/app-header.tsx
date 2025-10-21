"use client";

import * as React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import DeploymentPipeline from "@/components/deployment-pipeline";
import { cn } from "@/lib/utils";
import type { PipelineStatus } from "@/lib/types";
import { ChevronDown, Cog, UploadCloud, ShieldCheck, Wifi, History } from "lucide-react";

interface AppHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  pipelineStatus: PipelineStatus;
  onManualAction: (step: keyof Omit<PipelineStatus, 'codeGen'>) => void;
  onShowHistory: () => void;
}

export default function AppHeader({ pipelineStatus, onManualAction, onShowHistory, className, ...props }: AppHeaderProps) {
  const isActionInProgress = Object.values(pipelineStatus).some(status => status === 'processing');

  return (
    <header className={cn("flex flex-col gap-4 p-4 rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 256 256"
                  className="h-8 w-8 text-primary"
                >
                  <rect width="256" height="256" fill="none" />
                  <path
                    d="M88,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <path
                    d="M112,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <path
                    d="M168,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <path
                    d="M192,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <rect
                    x="32"
                    y="48"
                    width="192"
                    height="160"
                    rx="16"
                    transform="translate(256 256) rotate(180)"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                </svg>
                <h1 className="text-xl font-headline font-bold">AIoT Studio</h1>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onShowHistory}>
                <History className="mr-2 h-4 w-4" />
                Version History
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isActionInProgress}>
                  Actions <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onManualAction('compile')} disabled={isActionInProgress}>
                  <Cog className="mr-2 h-4 w-4" /> Compile Firmware
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onManualAction('upload')} disabled={isActionInProgress}>
                  <UploadCloud className="mr-2 h-4 w-4" /> Upload to Docker
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onManualAction('verify')} disabled={isActionInProgress}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Verify on Device
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Wifi className="mr-2 h-4 w-4" /> Send OTA Update
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <DeploymentPipeline status={pipelineStatus} />
    </header>
  );
}
