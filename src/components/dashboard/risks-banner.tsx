"use client"

import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function RisksBanner({ risks }: { risks: any[] }) {
  const active = risks.filter((r: any) => r.severity === "critical" || r.severity === "warning")
  if (active.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {active.map((r: any, i: number) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border-l-4 bg-white dark:bg-card border shrink-0 ${
            r.severity === "critical" ? "border-l-red-500" : "border-l-amber-500"
          }`}
        >
          <AlertTriangle className={`h-4 w-4 shrink-0 ${r.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
          <div>
            <span className="text-sm font-medium">{r.title}</span>
            <span className="text-xs text-muted-foreground ml-2">{r.description}</span>
          </div>
          <Badge variant={r.severity === "critical" ? "destructive" : "secondary"} className="text-xs shrink-0 ml-2">
            {r.metric}
          </Badge>
        </div>
      ))}
    </div>
  )
}
