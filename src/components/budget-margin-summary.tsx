"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"
import { BUDGET_COLORS, ANIMATION, AXIS_TICK, fmtK, fmt } from "@/lib/budget-chart-theme"

interface BudgetMarginSummaryProps {
  revenuePlan: number
  revenueForecast: number
  revenueActual: number
  expensePlan: number
  expenseForecast: number
  expenseActual: number
  marginPlan: number
  marginForecast: number
  marginActual: number
  className?: string
}

export function BudgetMarginSummary({
  revenuePlan, revenueForecast, revenueActual,
  expensePlan, expenseForecast, expenseActual,
  marginPlan, marginForecast, marginActual,
  className,
}: BudgetMarginSummaryProps) {
  const data = [
    { name: "Доходы", plan: revenuePlan, forecast: revenueForecast, actual: revenueActual },
    { name: "Расходы", plan: expensePlan, forecast: expenseForecast, actual: expenseActual },
    { name: "Маржа", plan: marginPlan, forecast: marginForecast, actual: marginActual },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl text-sm min-w-[180px]">
        <div className="font-semibold text-popover-foreground mb-2 pb-1.5 border-b border-border/50">{label}</div>
        <div className="space-y-1">
          {payload.map((p: any) => (
            <div key={p.dataKey} className="flex justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="text-muted-foreground text-xs">{p.name}</span>
              </span>
              <span className="font-mono font-medium">{fmt(p.value)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 10, right: 10, top: 5, bottom: 5 }} barGap={3} barSize={28}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" vertical={false} />
          <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontWeight: 500 }} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickFormatter={v => fmtK(v)} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="rect"
            iconSize={10}
          />
          <Bar
            dataKey="plan"
            name="План"
            fill={BUDGET_COLORS.planIndigo}
            radius={[3, 3, 0, 0]}
            animationDuration={ANIMATION.duration}
            animationEasing={ANIMATION.easing}
          />
          <Bar
            dataKey="forecast"
            name="Прогноз"
            fill={BUDGET_COLORS.forecastAmber}
            radius={[3, 3, 0, 0]}
            animationDuration={ANIMATION.duration}
            animationEasing={ANIMATION.easing}
          />
          <Bar
            dataKey="actual"
            name="Факт"
            fill={BUDGET_COLORS.actualGreen}
            radius={[3, 3, 0, 0]}
            animationDuration={ANIMATION.duration}
            animationEasing={ANIMATION.easing}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
