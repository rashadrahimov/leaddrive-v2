"use client"

import { useTranslations } from "next-intl"
import { TrendingUp } from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"

export function RevenueTrend({ forecast }: { forecast: any[] }) {
  const t = useTranslations("dashboard")

  // Use only the actual data (first 6 months with actual values)
  const actualData = forecast?.filter((f: any) => f.actual > 0) || []

  return (
    <div className="rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">{t("revenueTrend")}</span>
        </div>
        {actualData.length >= 2 && (
          <span className="text-xs text-emerald-600 font-medium">
            {(() => {
              const last = actualData[actualData.length - 1]?.actual || 0
              const prev = actualData[actualData.length - 2]?.actual || 1
              const pct = Math.round(((last - prev) / (prev || 1)) * 100)
              return pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`
            })()}
          </span>
        )}
      </div>
      {forecast && forecast.length > 0 ? (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={forecast} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
            <Tooltip formatter={((v: number, name: string) => [`${v.toLocaleString()} ₼`, name === "actual" ? t("actual") : t("projected")]) as any} />
            <Area type="monotone" dataKey="actual" stroke="#8b5cf6" fill="url(#revGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="projected" stroke="#3b82f6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">{t("noData")}</div>
      )}
    </div>
  )
}
