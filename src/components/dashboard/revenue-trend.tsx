"use client"

import { useTranslations } from "next-intl"
import { TrendingUp } from "lucide-react"
import { fmtAmount } from "@/lib/utils"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export function RevenueTrend({ forecast }: { forecast: any[] }) {
  const t = useTranslations("dashboard")

  const chartData = (forecast || []).map(f => ({
    ...f,
    // Backward compat: if only projected exists, treat as pipeline
    committed: f.committed ?? 0,
    bestCase: f.bestCase ?? 0,
    pipeline: f.pipeline ?? f.projected ?? 0,
  }))

  const lastActual = chartData.filter(d => d.actual > 0)
  const trend = lastActual.length >= 2
    ? Math.round(((lastActual[lastActual.length - 1].actual - lastActual[0].actual) / (lastActual[0].actual || 1)) * 100)
    : 0

  return (
    <div className="rounded-lg bg-card border border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">{t("revenueTrend")}</span>
        </div>
        {trend !== 0 && (
          <span className={`text-xs font-semibold ${trend > 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGradActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revGradCommitted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={((v: number, name: string) => {
                const labels: Record<string, string> = { actual: t("chartActual"), committed: t("chartCommitted"), bestCase: t("chartBestCase"), pipeline: t("chartPipeline") }
                return [fmtAmount(v), labels[name] || name]
              }) as any}
              labelStyle={{ fontSize: 11 }}
            />
            <Area type="monotone" dataKey="actual" stroke="#10b981" fill="url(#revGradActual)" strokeWidth={2} />
            <Area type="monotone" dataKey="committed" stroke="#3b82f6" fill="url(#revGradCommitted)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="bestCase" stroke="#8b5cf6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
            <Area type="monotone" dataKey="pipeline" stroke="#94a3b8" fill="none" strokeWidth={1} strokeDasharray="2 2" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
