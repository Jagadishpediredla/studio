
"use client";

import * as React from 'react';
import Link from 'next/link';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PipelineStatus } from "@/lib/types";
import { Cog, Rocket, Wifi, History, LayoutDashboard, Cpu, MoreVertical, Home, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ESP32Svg } from './esp32-svg';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


interface AppHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  projectName: string;
  onManualAction: (step: keyof Omit<PipelineStatus, 'codeGen'> | 'testConnection') => void;
  onShowHistory: () => void;
  isGenerating: boolean;
}

export default function AppHeader({ projectName, onManualAction, onShowHistory, isGenerating, className, ...props }: AppHeaderProps) {
  
  return (
    <header className={cn("flex items-center justify-between px-3 py-2 border-b h-14", className)} {...props}>
        <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
                 <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 256 256"
                  className="h-8 w-8 text-primary"
                >
                  <rect width="256" height="256" fill="none" />
                  <path d="M88,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <path d="M112,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
                  <path d="M168,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <path d="M192,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <rect x="32" y="48" width="192" height="160" rx="16" transform="translate(256 256) rotate(180)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
                </svg>
            </Link>
             <div className="h-6 w-px bg-border" />
             <h1 className="text-xl font-headline font-bold text-foreground">{projectName}</h1>
        </div>
        <div className="flex items-center gap-1">
            <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/">
                                <Home className="h-5 w-5" />
                                <span className="sr-only">Project Dashboard</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Project Dashboard</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/dashboard">
                                <LayoutDashboard className="h-5 w-5" />
                                <span className="sr-only">Job Dashboard</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Job Dashboard</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onShowHistory}>
                            <History className="h-5 w-5" />
                            <span className="sr-only">Version History</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Version History</p></TooltipContent>
                </Tooltip>
                 <Dialog>
                  <DialogTrigger asChild>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Cpu className="h-5 w-5" />
                                <span className="sr-only">Pinout</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>ESP32 Pinout</p></TooltipContent>
                    </Tooltip>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] md:max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="font-headline">ESP32 Pinout - Detailed View</DialogTitle>
                    </DialogHeader>
                    <div className="flex-grow min-h-0 flex items-center justify-center p-4">
                        <ESP32Svg className="max-w-full max-h-full object-contain" />
                    </div>
                  </DialogContent>
                </Dialog>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/settings">
                                <Settings className="h-5 w-5" />
                                <span className="sr-only">Settings</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Settings</p></TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isGenerating}>
                      <MoreVertical className="h-5 w-5" />
                      <span className="sr-only">More Actions</span>
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
            </TooltipProvider>
        </div>
    </header>
  );
}
