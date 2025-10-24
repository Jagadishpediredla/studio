
"use client";

import * as React from 'react';
import Link from 'next/link';
import { Home, LayoutDashboard, Settings, History, Bot, Terminal, BrainCircuit } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavRailProps {
    onManualAction: (action: 'showHistory' | 'showLogs' | 'showVisualizer') => void;
}

const navItems = [
    { href: "/", icon: Home, label: "Projects" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Job Dashboard" },
    { action: "showHistory", icon: History, label: "Version History" },
    { action: "showLogs", icon: Terminal, label: "Logs" },
    { action: "showVisualizer", icon: BrainCircuit, label: "Visualizer" },
    { href: "/settings", icon: Settings, label: "AI Settings" },
];

export default function NavRail({ onManualAction }: NavRailProps) {
    
    return (
        <aside className="h-full bg-card border-r flex flex-col items-center justify-between p-2">
            <div>
                 <TooltipProvider>
                    <Link href="/" className="flex items-center justify-center p-2 mb-4">
                        <Bot className="h-8 w-8 text-primary" />
                    </Link>
                    <nav className="flex flex-col items-center gap-2">
                    {navItems.map((item) => (
                         <Tooltip key={item.label}>
                            <TooltipTrigger asChild>
                                {item.href ? (
                                    <Link href={item.href} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted">
                                        <item.icon className="h-5 w-5" />
                                        <span className="sr-only">{item.label}</span>
                                    </Link>
                                ) : (
                                    <button onClick={() => onManualAction(item.action as any)} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted">
                                        <item.icon className="h-5 w-5" />
                                        <span className="sr-only">{item.label}</span>
                                    </button>
                                )}
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>{item.label}</p></TooltipContent>
                        </Tooltip>
                    ))}
                    </nav>
                 </TooltipProvider>
            </div>
        </aside>
    );
}
