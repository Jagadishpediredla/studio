
"use client";

import * as React from 'react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineStatus } from "@/lib/types";
import { ChevronDown, Cog, UploadCloud, ShieldCheck, Wifi, History, Rocket, LayoutDashboard } from "lucide-react";

interface AppHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onManualAction: (step: keyof Omit<PipelineStatus, 'codeGen'> | 'testConnection') => void;
  onShowHistory: () => void;
  isGenerating: boolean;
}

export default function AppHeader({ onManualAction, onShowHistory, isGenerating, className, ...props }: AppHeaderProps) {
  
  return (
    <header className={cn("flex items-center justify-between p-2 border-b", className)} {...props}>
        <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
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
            </Link>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
                <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Job Dashboard
                </Link>
            </Button>
            <Button variant="outline" onClick={onShowHistory}>
                <History className="mr-2 h-4 w-4" />
                Version History
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isGenerating}>
                  Actions <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                 <DropdownMenuItem onClick={() => onManualAction('testConnection')} disabled={isGenerating}>
                  <Wifi className="mr-2 h-4 w-4" /> Test Connection
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ota">
                    <Rocket className="mr-2 h-4 w-4" />
                    <span>Go to OTA Update</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onManualAction('compile')} disabled={isGenerating}>
                  <Cog className="mr-2 h-4 w-4" /> Manually Compile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </header>
  );
}
