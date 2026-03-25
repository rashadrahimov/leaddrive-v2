"use client"

import { ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from "recharts"

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

function pctLabel(value: number, reference: number): string {
  if (reference === 0) return ""
  const pct = ((value - reference) / reference) * 100
  if (Math.abs(pct) < 0.5) return ""
  return (pct >= 0 ? "+" : "") + Math.round(pct) + "%"
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

  const forecastPct = totalPlanned > 0 ? Math.abs(forecastDelta / totalPlanned * 100) : 0
  const variancePct = totalActual > 0 ? Math.abs(totalVariance / totalActual * 100) : 0
  const actualVsPlanPct = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned * 100) : 0
  const projVsPlanPct = totalPlanned > 0 ? ((yearEndProjection - totalPlanned) / totalPlanned * 100) : 0

  const data = [
    { name: "Бюджет", value: totalPlanned, base: 0, isStart: true, label: "" },
    { name: "Δ Прогноз", value: Math.abs(forecastDelta), base: forecastDelta >= 0 ? totalPlanned : totalPlanned + forecastDelta, positive: forecastDelta >= 0, label: pctLabel(totalForecast, totalPlanned) },
    { name: "Факт", value: totalActual, base: 0, isTotal: true, label: pctLabel(totalActual, totalPlanned) },
    { name: "Δ Отклонение", value: Math.abs(totalVariance), base: totalVariance >= 0 ? totalActual : totalActual - Math.abs(totalVariance), positive: totalVariance >= 0, label: "" },
    { name: "Проекция", value: yearEndProjection, base: 0, isTotal: true, label: pctLabel(yearEndProjection, totalPlanned) },
  ]

  const getColor = (item: (typeof data)[0]) => {
    if (item.isStart) return "#3b82f6"
    if (item.isTotal) {
      // Color totals based on variance from plan
      if (item.name === "Факт") {
        const pct = Math.abs(actualVsPlanPct)
        if (pct <= 5) return "#10b981"     // green: within 5%
        if (pct <= 15) return "#f59e0b"    // amber: 5-15%
        return "#ef4444"                    // red: >15%
      }
      if (item.name === "Проекция") {
        const pct = Math.abs(projVsPlanPct)
        if (pct <= 5) return "#8b5cf6"
        if (pct <= 15) return "#f59e0b"
        return "#ef4444"
      }
      return "#8b5cf6"
    }
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
        {d.label && <p className="text-xs mt-1 font-mono">{d.label} vs бюджет</p>}
      </div>
    )
  }

  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, index } = props
    const item = data[index]
    if (!item?.label) return null
    const isNegative = item.label.startsWith("-")
    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill={isNegative ? "#ef4444" : item.label.startsWith("+") && parseFloat(item.label) > 15 ? "#ef4444" : "#10b981"}
        textAnchor="middle"
        fontSize={11}
        fontWeight="bold"
      >
        {item.label}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300} className={className}>
      <ComposedChart data={data} margin={{ left: 10, right: 10, top: 25 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(0) + "k"} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#6b7280" />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" />
        <Bar dataKey="value" stackId="waterfall" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={getColor(entry)} />
          ))}
          <LabelList content={renderCustomLabel} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  )
}
