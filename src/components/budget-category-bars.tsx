"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts"
import { BUDGET_COLORS, ANIMATION, AXIS_TICK, fmtK, fmt } from "@/lib/budget-chart-theme"
import type { BudgetCategoryRow } from "@/lib/budgeting/types"

interface BudgetCategoryBarsProps {
  categories: BudgetCategoryRow[]
  className?: string
}

export function BudgetCategoryBars({ categories, className }: BudgetCategoryBarsProps) {
  // Top 8 categories by planned amount, sorted descending
  const data = [...categories]
    .sort((a, b) => b.planned - a.planned)
    .slice(0, 8)
    .map(c => ({
      name: c.category.length > 18 ? c.category.slice(0, 16) + "…" : c.category,
      fullName: c.category,
      plan: c.planned,
      actual: c.actual,
      variancePct: c.variancePct,
      lineType: c.lineType,
    }))

  const getActualColor = (variancePct: number) => {
    const abs = Math.abs(variancePct)
    if (abs <= 5) return BUDGET_COLORS.actualGreen
    if (abs <= 15) return BUDGET_COLORS.warning
    return BUDGET_COLORS.negative
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl text-sm min-w-[200px]">
        <div className="font-semibold text-popover-foreground mb-2 pb-1.5 border-b border-border/50">{d.fullName}</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BUDGET_COLORS.planIndigo }} />
              <span className="text-muted-foreground text-xs">План</span>
            </span>
            <span className="font-mono font-medium">{fmt(d.plan)}</span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getActualColor(d.variancePct) }} />
              <span className="text-muted-foreground text-xs">Факт</span>
            </span>
            <span className="font-mono font-medium">{fmt(d.actual)}</span>
          </div>
          <div className="pt-1 border-t border-border/50 flex justify-between text-xs">
            <span className="text-muted-foreground">Отклонение</span>
            <span className="font-mono font-bold" style={{ color: getActualColor(d.variancePct) }}>
              {d.variancePct >= 0 ? "+" : ""}{Math.round(d.variancePct)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
          Нет данных по категориям
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }} barGap={2} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/15" horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickFormatter={v => fmtK(v)} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
          <Bar
            dataKey="plan"
            fill={BUDGET_COLORS.planIndigo}
            radius={[0, 3, 3, 0]}
            animationDuration={ANIMATION.duration}
            animationEasing={ANIMATION.easing}
            opacity={0.7}
          />
          <Bar
            dataKey="actual"
            radius={[0, 3, 3, 0]}
            animationDuration={ANIMATION.duration}
            animationEasing={ANIMATION.easing}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={getActualColor(entry.variancePct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
