"use client"

import {
  Panel as ResizablePanel,
  PanelGroup as ResizablePanelGroup,
  PanelResizeHandle as ResizablePrimitiveHandle,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: {
  withHandle?: boolean
  className?: string
  [key: string]: any
}) => (
  <ResizablePrimitiveHandle
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 [&[data-panel-group-direction=vertical]>div]:h-1 [&[data-panel-group-direction=vertical]>div]:w-full [&[data-panel-group-direction=vertical]]:h-px [&[data-panel-group-direction=vertical]]:w-full",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <div className="h-2.5 w-1 rounded-sm bg-muted-foreground/50" />
      </div>
    )}
  </ResizablePrimitiveHandle>
)

export { ResizablePanel, ResizablePanelGroup, ResizableHandle }
