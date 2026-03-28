"use client"

import { useTranslations } from "next-intl"
import { Users } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

const SOURCE_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#ef4444"]

const sourceLabels: Record<string, string> = {
  website: "Web sayt",
  web: "Web sayt",
  linkedin: "LinkedIn",
  referral: "Referral",
  campaign: "Kampaniya",
  cold_call: "Soyuq zəng",
  event: "Tədbir",
  unknown: "Digər",
}

export function LeadSourcesDonut({ sources, total }: { sources: any[]; total: number }) {
  const t = useTranslations("dashboard")

  const data = (sources || [])
    .filter((s: any) => s.count > 0)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 6)

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">{t("leadSources")}</span>
        </div>
        <span className="text-xs text-muted-foreground">{total}</span>
      </div>
      {data.length > 0 ? (
        <div className="flex items-center gap-3">
          <div className="w-[80px] h-[80px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="source"
                  cx="50%" cy="50%"
                  innerRadius={22} outerRadius={38}
                  paddingAngle={2}
                >
                  {data.map((_: any, i: number) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 flex-1">
            {data.map((s: any, i: number) => {
              const pct = total > 0 ? Math.round((s.count / total) * 100) : 0
              return (
                <div key={s.source} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">
                    {sourceLabels[s.source?.toLowerCase()] || s.source || "Digər"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="h-[80px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
