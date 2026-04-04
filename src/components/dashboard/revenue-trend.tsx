"use client"

import { useTranslations } from "next-intl"
import { TrendingUp } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

export function RevenueTrend({ forecast }: { forecast: any[] }) {
  const t = useTranslations("dashboard")

  const chartData = (forecast || []).map(f => ({
    ...f,
    value: f.actual || f.projected || 0,
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
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v: number) => [`₼${v.toLocaleString()}`, ""]} labelStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="actual" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="projected" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
