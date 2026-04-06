"use client"

import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function RisksBanner({ risks }: { risks: any[] }) {
  const t = useTranslations("dashboard")
  const active = risks.filter((r: any) => r.severity === "critical" || r.severity === "warning")
  if (active.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {active.map((r: any, i: number) => (
        <div
          key={i}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-l-4 bg-card border border-border min-w-0 ${
            r.severity === "critical" ? "border-l-red-500" : "border-l-amber-500"
          }`}
        >
          <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${r.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">{r.titleKey ? t(r.titleKey) : r.title}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">{r.descKey ? t(r.descKey, r.descParams || {}) : r.description}</div>
          </div>
          <Badge variant={r.severity === "critical" ? "destructive" : "secondary"} className="text-[10px] shrink-0 ml-1">
            {r.metric}
          </Badge>
        </div>
      ))}
    </div>
  )
}
