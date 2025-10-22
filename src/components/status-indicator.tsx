"use client";

import * as React from 'react';
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  isProcessing: boolean;
  statusMessage: string;
}

export default function StatusIndicator({ isProcessing, statusMessage }: StatusIndicatorProps) {
  return (
    <div className="flex flex-grow items-center gap-2 rounded-lg border bg-background p-2">
      <div className="flex items-center gap-2">
        <span className={cn("relative flex h-3 w-3", isProcessing && "animate-pulse")}>
          <span className={cn(
            "absolute inline-flex h-full w-full rounded-full",
            isProcessing ? "bg-yellow-400" : "bg-green-500",
            isProcessing && "animate-ping"
          )}></span>
          <span className={cn(
            "relative inline-flex rounded-full h-3 w-3",
            isProcessing ? "bg-yellow-500" : "bg-green-600"
          )}></span>
        </span>
        <span className="text-sm font-medium text-muted-foreground">Status:</span>
      </div>
      <p className="text-sm text-foreground flex-grow truncate" title={statusMessage}>
        {statusMessage}
      </p>
    </div>
  );
}
