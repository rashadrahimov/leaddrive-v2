"use client"

import { useTranslations } from "next-intl"
import { Bot } from "lucide-react"

function getScoreGrade(score: number): { letter: string; bg: string } {
  if (score >= 80) return { letter: "A", bg: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" }
  if (score >= 60) return { letter: "B", bg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" }
  if (score >= 40) return { letter: "C", bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" }
  return { letter: "D", bg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" }
}

export function AiLeadScoring({ leads }: { leads: any[] }) {
  const t = useTranslations("dashboard")

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Bot className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">{t("aiLeadScoring")}</span>
        </div>
        <a href="/leads" className="text-[10px] text-violet-600 hover:underline">{t("viewAll")} →</a>
      </div>
      {leads && leads.length > 0 ? (
        <div className="space-y-1">
          {leads.map((l: any) => {
            const grade = getScoreGrade(l.score)
            return (
              <a key={l.id} href={`/leads/${l.id}`} className="flex items-center gap-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors">
                <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 border ${grade.bg}`}>
                  {grade.letter}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{l.name}</span>
                  <span className="text-[10px] text-muted-foreground">{l.company || "—"}</span>
                </div>
              </a>
            )
          })}
        </div>
      ) : (
        <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
