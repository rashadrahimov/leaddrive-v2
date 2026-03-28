"use client"

import { useTranslations } from "next-intl"
import { Handshake, Star } from "lucide-react"

const stageColors: Record<string, string> = {
  LEAD: "bg-violet-500", QUALIFIED: "bg-blue-500", PROPOSAL: "bg-cyan-500",
  NEGOTIATION: "bg-teal-500", WON: "bg-emerald-500", LOST: "bg-red-500",
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

export function RecentDeals({ deals }: { deals: any[] }) {
  const t = useTranslations("dashboard")

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Handshake className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">{t("recentDeals")}</span>
        </div>
        <a href="/deals" className="text-[10px] text-violet-600 hover:underline">{t("viewAll")} →</a>
      </div>
      {deals && deals.length > 0 ? (
        <div className="space-y-1">
          {deals.map((d: any) => (
            <a key={d.id} href={`/deals/${d.id}`} className="flex items-center gap-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors">
              <div className={`w-1 h-5 rounded-full flex-shrink-0 ${stageColors[d.stage] || "bg-slate-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium truncate">{d.name}</span>
                  {d.stage === "NEGOTIATION" && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                </div>
                <span className="text-[10px] text-muted-foreground">{d.company || "—"}</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600 flex-shrink-0">₼{fmt(d.value || 0)}</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
