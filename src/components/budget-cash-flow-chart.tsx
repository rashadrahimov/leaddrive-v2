"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Banknote } from "lucide-react"
import {
  BarChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart, Legend,
} from "recharts"

interface MonthData {
  month: number
  year: number
  opening: number
  inflows: number
  outflows: number
  net: number
  closing: number
}

interface Props {
  months: MonthData[]
  year: number
  totalInflows: number
  totalOutflows: number
}

const MONTH_KEYS = ["monthShort_jan", "monthShort_feb", "monthShort_mar", "monthShort_apr", "monthShort_may", "monthShort_jun", "monthShort_jul", "monthShort_aug", "monthShort_sep", "monthShort_oct", "monthShort_nov", "monthShort_dec"] as const

function fmt(n: number): string {
  if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + "K"
  return n.toFixed(0)
}

export function BudgetCashFlowChart({ months, year, totalInflows, totalOutflows }: Props) {
  const t = useTranslations("budgeting")
  const chartData = months.map((m) => ({
    name: t(MONTH_KEYS[m.month - 1]),
    inflows: m.inflows,
    outflows: -m.outflows,
    closing: m.closing,
  }))

  const hasNegative = months.some((m) => m.closing < 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            {t("cashFlowChart_title")} — {year}
          </span>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-green-700 bg-green-50">
              {t("cashFlowChart_inflows")}: {fmt(totalInflows)}
            </Badge>
            <Badge variant="outline" className="text-red-700 bg-red-50">
              {t("cashFlowChart_outflows")}: {fmt(totalOutflows)}
            </Badge>
            {hasNegative && (
              <Badge className="bg-red-100 text-red-800">{t("cashFlowChart_cashGap")}</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip
                formatter={((value: number, name: string) => [
                  fmt(Math.abs(value)),
                  name === "outflows" ? t("cashFlowChart_outflows") : name === "inflows" ? t("cashFlowChart_inflows") : t("cashFlowChart_balance"),
                ]) as any}
              />
              <Legend />
              <Bar dataKey="inflows" fill="#22c55e" name={t("cashFlowChart_inflows")} radius={[2, 2, 0, 0]} />
              <Bar dataKey="outflows" fill="#ef4444" name={t("cashFlowChart_outflows")} radius={[2, 2, 0, 0]} />
              <Line
                type="monotone"
                dataKey="closing"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: "#6366f1" }}
                name={t("cashFlowChart_balance")}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
