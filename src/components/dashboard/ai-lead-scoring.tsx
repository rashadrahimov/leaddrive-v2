"use client"

import { useTranslations } from "next-intl"
import { Brain } from "lucide-react"

const gradeColors: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  B: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  C: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  D: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

function getGrade(score: number): string {
  if (score >= 80) return "A"
  if (score >= 60) return "B"
  if (score >= 40) return "C"
  return "D"
}

export function AiLeadScoring({ leads }: { leads: any[] }) {
  const t = useTranslations("dashboard")

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Brain className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">{t("aiLeadScoring")}</span>
        </div>
        <a href="/leads" className="text-[10px] text-violet-600 hover:underline">{t("viewAll")} →</a>
      </div>
      {leads && leads.length > 0 ? (
        <div className="space-y-1.5">
          {leads.map((l: any) => {
            const grade = getGrade(l.score || 0)
            return (
              <div key={l.id} className="flex items-center gap-2 py-0.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${gradeColors[grade]}`}>
                  {grade}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{l.contactName || l.companyName || "—"}</span>
                  <span className="text-[10px] text-muted-foreground">{l.companyName || "—"}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
