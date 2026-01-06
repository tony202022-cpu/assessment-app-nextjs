"use client"

import * as React from "react"
import { GripVertical } from "lucide-react"

import * as RP from "react-resizable-panels"
import { cn } from "@/lib/utils"

/**
 * Some installs of `react-resizable-panels` end up with type definitions
 * that don't expose PanelGroup/Panel/PanelResizeHandle correctly.
 * We intentionally cast to `any` to avoid TypeScript build failures.
 */
const PanelGroupAny = (RP as any).PanelGroup as React.ComponentType<any>
const PanelAny = (RP as any).Panel as React.ComponentType<any>
const PanelResizeHandleAny = (RP as any).PanelResizeHandle as React.ComponentType<any>

const ResizablePanelGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    direction?: "horizontal" | "vertical"
    autoSaveId?: string
    storage?: any
    onLayout?: (sizes: number[]) => void
    id?: string
  }
>(({ className, direction = "horizontal", ...props }, ref) => {
  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <PanelGroupAny
        direction={direction}
        className={cn(
          "flex h-full w-full data-[panel-group-direction=vertical]:flex-col"
        )}
        {...props}
      />
    </div>
  )
})
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = React.forwardRef<HTMLDivElement, any>(
  ({ className, ...props }, ref) => {
    return <PanelAny ref={ref} className={cn(className)} {...props} />
  }
)
ResizablePanel.displayName = "ResizablePanel"

const ResizableHandle = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    withHandle?: boolean
    className?: string
  }
>(({ withHandle = false, className, ...props }, ref) => {
  return (
    <PanelResizeHandleAny
      ref={ref}
      className={cn(
        "relative flex w-px items-center justify-center bg-border",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
        "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:top-1/2 data-[panel-group-direction=vertical]:after:h-2 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-background">
          <GripVertical className="h-3 w-3" />
        </div>
      )}
    </PanelResizeHandleAny>
  )
})
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
