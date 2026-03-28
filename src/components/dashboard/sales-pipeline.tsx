"use client"

import { useTranslations } from "next-intl"
import { Target } from "lucide-react"

const stageColors: Record<string, string> = {
  LEAD: "#94a3b8", QUALIFIED: "#3b82f6", PROPOSAL: "#8b5cf6",
  NEGOTIATION: "#f59e0b", WON: "#22c55e", LOST: "#ef4444",
}
const stageLabels: Record<string, string> = {
  LEAD: "Yeni", QUALIFIED: "Kvalifikasiya", PROPOSAL: "Təklif",
  NEGOTIATION: "Danışıq", WON: "Qazanıldı", LOST: "İtirildi",
}

function fmt(n: number): string {
  if (n >= 1000) return `₼${(n / 1000).toFixed(0)}K`
  return `₼${n}`
}

export function SalesPipeline({ pipeline }: { pipeline: any }) {
  const t = useTranslations("dashboard")
  const stageOrder = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"]
  const stages = pipeline?.stages || []

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold">{t("salesPipeline")}</span>
        </div>
        <span className="text-xs font-semibold text-blue-600">{fmt(pipeline?.wonValue || 0)}</span>
      </div>
      <div className="space-y-1.5">
        {stageOrder.map(stage => {
          const s = stages.find((x: any) => x.stage === stage)
          if (!s) return null
          const maxCount = Math.max(...stages.map((x: any) => x.count || 1))
          const width = Math.max((s.count / maxCount) * 100, 12)
          return (
            <div key={stage} className="flex items-center gap-2">
              <span className="text-[10px] w-[72px] text-muted-foreground truncate">{stageLabels[stage] || stage}</span>
              <div className="flex-1 h-5 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
                <div
                  className="h-full rounded flex items-center px-1.5"
                  style={{ width: `${width}%`, backgroundColor: stageColors[stage] }}
                >
                  <span className="text-[10px] text-white font-medium">{s.count}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono w-12 text-right text-muted-foreground">{s.value?.toLocaleString()}</span>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-center">
        <div>
          <div className="text-sm font-bold text-emerald-600">{pipeline?.wonThisMonth || 0}</div>
          <div className="text-[8px] text-muted-foreground">{t("won")}</div>
        </div>
        <div>
          <div className="text-sm font-bold text-red-500">{pipeline?.lostThisMonth || 0}</div>
          <div className="text-[8px] text-muted-foreground">{t("lost")}</div>
        </div>
        <div>
          <div className="text-sm font-bold text-blue-600">{pipeline?.conversionRate || 0}%</div>
          <div className="text-[8px] text-muted-foreground">{t("conversion")}</div>
        </div>
      </div>
    </div>
  )
}
