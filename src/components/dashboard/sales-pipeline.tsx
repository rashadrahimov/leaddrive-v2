"use client"

import { useTranslations } from "next-intl"
import { Target } from "lucide-react"

const statusLabels: Record<string, string> = {
  LEAD: "Yeni", QUALIFIED: "Kvalifikasiya", PROPOSAL: "Təklif",
  NEGOTIATION: "Danışıq", WON: "Qazanıldı", LOST: "İtirildi",
}
const stageOrder = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"]
const stageColors: Record<string, string> = {
  LEAD: "#8b5cf6", QUALIFIED: "#3b82f6", PROPOSAL: "#06b6d4",
  NEGOTIATION: "#14b8a6", WON: "#22c55e", LOST: "#ef4444",
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

export function SalesPipeline({ pipeline }: { pipeline: any }) {
  const t = useTranslations("dashboard")

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Target className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">{t("salesPipeline")}</span>
        </div>
        <span className="text-xs text-muted-foreground">₼{fmt(pipeline.stages?.reduce((s: number, st: any) => s + (st.value || 0), 0) || 0)}</span>
      </div>
      <div className="space-y-1.5">
        {stageOrder.map(stage => {
          const s = (pipeline.stages || []).find((x: any) => x.stage === stage)
          if (!s) return null
          const maxCount = Math.max(...(pipeline.stages || []).map((x: any) => x.count || 1))
          const width = maxCount > 0 ? Math.max((s.count / maxCount) * 100, 8) : 8
          return (
            <div key={stage} className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground w-16 truncate">{statusLabels[stage] || stage}</span>
              <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${width}%`, backgroundColor: stageColors[stage] || "#94a3b8" }}
                />
              </div>
              <span className="text-[9px] font-medium w-5 text-right">{s.count}</span>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t text-center">
        <div>
          <div className="text-base font-bold text-green-600">{pipeline.wonThisMonth}</div>
          <div className="text-[9px] text-muted-foreground">{t("won")}</div>
        </div>
        <div>
          <div className="text-base font-bold text-red-500">{pipeline.lostThisMonth}</div>
          <div className="text-[9px] text-muted-foreground">{t("lost")}</div>
        </div>
        <div>
          <div className="text-base font-bold text-blue-600">{fmt(pipeline.wonValue)} ₼</div>
          <div className="text-[9px] text-muted-foreground">{t("totalWon")}</div>
        </div>
      </div>
    </div>
  )
}
