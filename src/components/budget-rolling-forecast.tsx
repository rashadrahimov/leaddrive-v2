"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarRange, Lock, Sparkles, Loader2 } from "lucide-react"

interface MonthData {
  year: number
  month: number
  status: string
  actualTotal: number
  forecastTotal: number
  total: number
}

interface Props {
  months: MonthData[]
  totalActual: number
  totalForecast: number
  onCloseMonth?: (year: number, month: number) => void
  onAutoForecast?: () => void
  isClosingMonth?: boolean
  isForecasting?: boolean
}

const MONTH_NAMES = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

function fmt(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(0) + "K"
  return n.toFixed(0)
}

export function BudgetRollingForecast({
  months,
  totalActual,
  totalForecast,
  onCloseMonth,
  onAutoForecast,
  isClosingMonth,
  isForecasting,
}: Props) {
  if (!months.length) return null

  const firstForecastIdx = months.findIndex((m) => m.status === "forecast")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            Скользящий прогноз — {months.length} мес.
          </span>
          <div className="flex gap-2">
            {onAutoForecast && (
              <Button size="sm" variant="outline" onClick={onAutoForecast} disabled={isForecasting}>
                {isForecasting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Авто-прогноз
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex gap-4 mb-4">
          <div className="p-2 rounded bg-blue-50 dark:bg-blue-900/20 flex-1 text-center">
            <div className="text-xs text-muted-foreground">Факт</div>
            <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{fmt(totalActual)}</div>
          </div>
          <div className="p-2 rounded bg-purple-50 dark:bg-purple-900/20 flex-1 text-center">
            <div className="text-xs text-muted-foreground">Прогноз</div>
            <div className="text-sm font-bold text-purple-700 dark:text-purple-300">{fmt(totalForecast)}</div>
          </div>
          <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 flex-1 text-center">
            <div className="text-xs text-muted-foreground">Итого</div>
            <div className="text-sm font-bold text-green-700 dark:text-green-300">{fmt(totalActual + totalForecast)}</div>
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
                  ${isActual ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : "bg-white dark:bg-gray-900 border-border"}`}
              >
                <div className="font-medium text-[10px] text-muted-foreground">
                  {MONTH_NAMES[m.month - 1]}
                </div>
                <div className="text-[10px] text-muted-foreground/60">{m.year}</div>
                <div className={`font-bold text-xs mt-1 ${isActual ? "text-blue-700 dark:text-blue-300" : "text-foreground"}`}>
                  {fmt(m.total)}
                </div>
                <Badge className={`text-[8px] mt-1 ${isActual ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                  {isActual ? "ФАКТ" : "ПР"}
                </Badge>
                {isActual === false && i === firstForecastIdx && onCloseMonth && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-full mt-1 text-[9px] px-0"
                    onClick={() => onCloseMonth(m.year, m.month)}
                    disabled={isClosingMonth}
                  >
                    <Lock className="h-2.5 w-2.5 mr-0.5" />
                    Закрыть
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
