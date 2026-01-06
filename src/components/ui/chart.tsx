"use client"

import * as React from "react"
import * as Recharts from "recharts"
import { cn } from "@/lib/utils"

const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<keyof typeof THEMES, string>
  }
}

type ChartContextValue = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) {
    throw new Error("useChart must be used inside ChartContainer")
  }
  return ctx
}

/* =========================
   CONTAINER
========================= */
export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ className, config, children, ...props }, ref) => {
  const id = React.useId().replace(/:/g, "")

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={id}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-layer]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={id} config={config} />
        <Recharts.ResponsiveContainer>{children}</Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

/* =========================
   STYLE
========================= */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(
    ([, v]) => v.color || v.theme
  )

  if (!entries.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => {
            const vars = entries
              .map(([k, v]) => {
                const color =
                  v.theme?.[theme as keyof typeof THEMES] ?? v.color
                return color ? `--color-${k}:${color};` : ""
              })
              .join("")
            return `${prefix} [data-chart="${id}"]{${vars}}`
          })
          .join("")
      }}
    />
  )
}

/* =========================
   TOOLTIP (SAFE)
========================= */
export const ChartTooltip = Recharts.Tooltip

export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  {
    active?: boolean
    payload?: any[]
    label?: any
    className?: string
  }
>(({ active, payload, label, className }, ref) => {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-background px-2 py-1 text-xs shadow",
        className
      )}
    >
      {label && <div className="mb-1 font-medium">{label}</div>}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const key = item.dataKey || item.name
          const cfg = config[key] || {}
          return (
            <div key={i} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span>{cfg.label ?? item.name}</span>
              <span className="ml-auto font-mono">
                {item.value?.toLocaleString?.() ?? item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

/* =========================
   LEGEND (SAFE)
========================= */
export const ChartLegend = Recharts.Legend

export const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  {
    payload?: any[]
    className?: string
  }
>(({ payload, className }, ref) => {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div
      ref={ref}
      className={cn("flex flex-wrap justify-center gap-4 pt-3", className)}
    >
      {payload.map((item, i) => {
        const cfg = config[item.dataKey] || {}
        return (
          <div key={i} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span>{cfg.label ?? item.value}</span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"
