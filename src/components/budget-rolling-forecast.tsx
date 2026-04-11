"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarRange, Lock, Unlock, Sparkles, Loader2 } from "lucide-react"

interface MonthData {
  year: number
  month: number
  status: string
  revenue: number
  expense: number
  margin: number
  total: number
}

interface Props {
  months: MonthData[]
  totalRevenue: number
  totalExpense: number
  totalMargin: number
  onCloseMonth?: (year: number, month: number) => void
  onReopenMonth?: (year: number, month: number) => void
  onAutoForecast?: () => void
  isClosingMonth?: boolean
  isReopeningMonth?: boolean
  isForecasting?: boolean
}

const MONTH_KEYS = ["monthShort_jan", "monthShort_feb", "monthShort_mar", "monthShort_apr", "monthShort_may", "monthShort_jun", "monthShort_jul", "monthShort_aug", "monthShort_sep", "monthShort_oct", "monthShort_nov", "monthShort_dec"] as const

function fmt(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(1) + "M"
  if (abs >= 1000) return sign + (abs / 1000).toFixed(0) + "K"
  return sign + abs.toFixed(0)
}

export function BudgetRollingForecast({
  months,
  totalRevenue,
  totalExpense,
  totalMargin,
  onCloseMonth,
  onReopenMonth,
  onAutoForecast,
  isClosingMonth,
  isReopeningMonth,
  isForecasting,
}: Props) {
  const t = useTranslations("budgeting")
  if (!months.length) return null

  const firstForecastIdx = months.findIndex((m) => m.status === "forecast")
  // Последний закрытый месяц — только его можно открыть обратно
  const lastActualIdx = firstForecastIdx > 0 ? firstForecastIdx - 1 : (months.every(m => m.status === "actual") ? months.length - 1 : -1)

  // Динамически считаем факт и прогноз из данных
  const actualMonths = months.filter((m) => m.status === "actual")
  const forecastMonths = months.filter((m) => m.status === "forecast")

  const factRevenue = actualMonths.reduce((s, m) => s + m.revenue, 0)
  const factExpense = actualMonths.reduce((s, m) => s + m.expense, 0)
  const factMargin = factRevenue - factExpense

  const prognozRevenue = forecastMonths.reduce((s, m) => s + m.revenue, 0)
  const prognozExpense = forecastMonths.reduce((s, m) => s + m.expense, 0)
  const prognozMargin = prognozRevenue - prognozExpense

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            {t("rollingForecast_title")} — {t("rollingForecast_months", { count: months.length })}
          </span>
          <div className="flex gap-2">
            {onAutoForecast && (
              <Button size="sm" variant="outline" onClick={onAutoForecast} disabled={isForecasting} className="ai-glow">
                {isForecasting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {t("rollingForecast_autoForecast")}
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary — одна строка с разбивкой факт/прогноз */}
        <div className="flex gap-4 mb-4">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">{t("rollingForecast_revenues")}</div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300">{fmt(totalRevenue)}</div>
            {actualMonths.length > 0 && forecastMonths.length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {t("rollingForecast_factPlusForecast", { fact: fmt(factRevenue), forecast: fmt(prognozRevenue) })}
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 flex-1 text-center">
            <div className="text-xs text-muted-foreground mb-1">{t("rollingForecast_expenses")}</div>
            <div className="text-lg font-bold text-red-700 dark:text-red-300">{fmt(totalExpense)}</div>
            {actualMonths.length > 0 && forecastMonths.length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {t("rollingForecast_factPlusForecast", { fact: fmt(factExpense), forecast: fmt(prognozExpense) })}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg flex-1 text-center ${totalMargin >= 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-orange-50 dark:bg-orange-900/20"}`}>
            <div className="text-xs text-muted-foreground mb-1">{t("rollingForecast_margin")}</div>
            <div className={`text-lg font-bold ${totalMargin >= 0 ? "text-blue-700 dark:text-blue-300" : "text-orange-700 dark:text-orange-300"}`}>{fmt(totalMargin)}</div>
            {actualMonths.length > 0 && forecastMonths.length > 0 && (
              <div className="text-[10px] text-muted-foreground mt-1">
                {t("rollingForecast_factPlusForecast", { fact: fmt(factMargin), forecast: fmt(prognozMargin) })}
              </div>
            )}
          </div>
        </div>

        {/* Monthly grid */}
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-1.5">
          {months.map((m, i) => {
            const isActual = m.status === "actual"
            return (
              <div
                key={`${m.year}-${m.month}`}
                className={`p-2 rounded-lg border text-center text-xs transition-colors
                  ${isActual ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : "bg-card border-border"}`}
              >
                <div className="font-medium text-[10px] text-muted-foreground">
                  {t(MONTH_KEYS[m.month - 1])}
                </div>
                <div className="text-[10px] text-muted-foreground/60">{m.year}</div>
                <div className="text-[10px] text-green-600 mt-0.5">+{fmt(m.revenue)}</div>
                <div className="text-[10px] text-red-500">-{fmt(m.expense)}</div>
                <div className={`font-bold text-xs ${m.margin >= 0 ? "text-blue-700 dark:text-blue-300" : "text-orange-600"}`}>
                  {fmt(m.margin)}
                </div>
                <Badge className={`text-[8px] mt-1 ${isActual ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`}>
                  {isActual ? t("rollingForecast_actual") : t("rollingForecast_fc")}
                </Badge>
                {isActual && i === lastActualIdx && onReopenMonth && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-full mt-1 text-[9px] px-0 text-blue-600"
                    onClick={() => onReopenMonth(m.year, m.month)}
                    disabled={isReopeningMonth}
                  >
                    <Unlock className="h-2.5 w-2.5 mr-0.5" />
                    {t("rollingForecast_open")}
                  </Button>
                )}
                {!isActual && i === firstForecastIdx && onCloseMonth && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-full mt-1 text-[9px] px-0"
                    onClick={() => onCloseMonth(m.year, m.month)}
                    disabled={isClosingMonth}
                  >
                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                    {t("rollingForecast_close")}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
