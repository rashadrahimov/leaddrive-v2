"use client"

import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"

interface WaterfallChartProps {
  totalPlanned: number
  totalForecast: number
  totalActual: number
  totalVariance: number
  yearEndProjection: number
  className?: string
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString() + " ₼"
}

export function BudgetWaterfallChart({
  totalPlanned,
  totalForecast,
  totalActual,
  totalVariance,
  yearEndProjection,
  className,
}: WaterfallChartProps) {
  // Waterfall: Budget → Forecast Delta → Actual → Variance → Year-End Projection
  const forecastDelta = totalForecast - totalPlanned
  const actualDelta = totalActual - totalForecast
  const projectionDelta = yearEndProjection - totalActual

  const data = [
    { name: "Бюджет", value: totalPlanned, base: 0, isStart: true },
    { name: "Δ Прогноз", value: Math.abs(forecastDelta), base: forecastDelta >= 0 ? totalPlanned : totalPlanned + forecastDelta, positive: forecastDelta >= 0 },
    { name: "Факт", value: totalActual, base: 0, isTotal: true },
    { name: "Δ Отклонение", value: Math.abs(totalVariance), base: totalVariance >= 0 ? totalActual : totalActual - Math.abs(totalVariance), positive: totalVariance >= 0 },
    { name: "Проекция ГОД", value: yearEndProjection, base: 0, isTotal: true },
  ]

  const getColor = (item: (typeof data)[0]) => {
    if (item.isStart) return "#3b82f6"
    if (item.isTotal) return "#8b5cf6"
    if (item.positive === undefined) return "#6b7280"
    return item.positive ? "#10b981" : "#ef4444"
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{d.name}</p>
        <p>{fmt(d.value)}</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280} className={className}>
      <ComposedChart data={data} margin={{ left: 10, right: 10, top: 10 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#6b7280" />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" />
        <Bar dataKey="value" stackId="waterfall" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getColor(entry)} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}
