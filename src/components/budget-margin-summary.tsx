"use client"

import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from "recharts"
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
  const [whatIfPct, setWhatIfPct] = useState(0) // -50 to +50
  const [showWhatIf, setShowWhatIf] = useState(false)

  const adjustedExpenseActual = useMemo(() => expenseActual * (1 + whatIfPct / 100), [expenseActual, whatIfPct])
  const adjustedMarginActual = useMemo(() => revenueActual - adjustedExpenseActual, [revenueActual, adjustedExpenseActual])

  const data = useMemo(() => [
    { name: "Доходы", plan: revenuePlan, forecast: revenueForecast, actual: revenueActual },
    { name: "Расходы", plan: expensePlan, forecast: expenseForecast, actual: showWhatIf ? adjustedExpenseActual : expenseActual },
    { name: "Маржа", plan: marginPlan, forecast: marginForecast, actual: showWhatIf ? adjustedMarginActual : marginActual },
  ], [revenuePlan, revenueForecast, revenueActual, expensePlan, expenseForecast, expenseActual, marginPlan, marginForecast, marginActual, showWhatIf, adjustedExpenseActual, adjustedMarginActual])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-xl text-sm min-w-[200px]">
        <div className="font-semibold text-popover-foreground mb-2 pb-1.5 border-b border-border/50">{label}</div>
        <div className="space-y-1.5">
          {payload.map((p: any) => {
            const planVal = payload.find((x: any) => x.dataKey === "plan")?.value ?? 0
            const diff = p.dataKey !== "plan" ? p.value - planVal : 0
            const diffPct = planVal !== 0 ? (diff / planVal) * 100 : 0
            return (
              <div key={p.dataKey}>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground text-xs">{p.name}</span>
                  </span>
                  <span className="font-mono font-medium">{fmt(p.value)}</span>
                </div>
                {p.dataKey !== "plan" && Math.abs(diffPct) > 0.5 && (
                  <div className="ml-4 text-[10px] font-mono" style={{ color: diffPct > 0 ? BUDGET_COLORS.positive : BUDGET_COLORS.negative }}>
                    {diffPct > 0 ? "+" : ""}{Math.round(diffPct)}% vs план
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {showWhatIf && whatIfPct !== 0 && label === "Расходы" && (
          <div className="mt-2 pt-1.5 border-t border-border/50 text-[10px] text-amber-500 font-medium">
            What-if: расходы {whatIfPct > 0 ? "+" : ""}{whatIfPct}%
          </div>
        )}
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
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
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
            name={showWhatIf && whatIfPct !== 0 ? `Факт (${whatIfPct > 0 ? "+" : ""}${whatIfPct}%)` : "Факт"}
            fill={showWhatIf && whatIfPct !== 0 ? BUDGET_COLORS.warning : BUDGET_COLORS.actualGreen}
            radius={[3, 3, 0, 0]}
            animationDuration={ANIMATION.duration}
            animationEasing={ANIMATION.easing}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* What-if controls */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowWhatIf(!showWhatIf); if (showWhatIf) setWhatIfPct(0) }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
              showWhatIf
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
            }`}
          >
            What-if
          </button>
          {showWhatIf && (
            <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-left-3 duration-200">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Расходы</span>
              <input
                type="range"
                min={-50}
                max={50}
                step={5}
                value={whatIfPct}
                onChange={e => setWhatIfPct(Number(e.target.value))}
                className="flex-1 h-1.5 accent-amber-500 cursor-pointer"
              />
              <span className={`text-xs font-mono font-bold min-w-[40px] text-right ${
                whatIfPct > 0 ? "text-red-500" : whatIfPct < 0 ? "text-green-500" : "text-muted-foreground"
              }`}>
                {whatIfPct > 0 ? "+" : ""}{whatIfPct}%
              </span>
            </div>
          )}
        </div>
        {showWhatIf && whatIfPct !== 0 && (
          <div className="mt-2 text-xs animate-in fade-in duration-200">
            <span className="text-muted-foreground">При изменении расходов на {whatIfPct > 0 ? "+" : ""}{whatIfPct}%, маржа: </span>
            <span className={`font-bold font-mono ${adjustedMarginActual >= 0 ? "text-green-500" : "text-red-500"}`}>
              {fmt(adjustedMarginActual)}
            </span>
            <span className="text-muted-foreground"> (было: {fmt(marginActual)}, </span>
            <span className={`font-medium ${adjustedMarginActual - marginActual >= 0 ? "text-green-500" : "text-red-500"}`}>
              {adjustedMarginActual - marginActual >= 0 ? "+" : ""}{fmt(adjustedMarginActual - marginActual)}
            </span>
            <span className="text-muted-foreground">)</span>
          </div>
        )}
      </div>
    </div>
  )
}
