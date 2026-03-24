/**
 * Budget Forecast Engine
 *
 * Produces a 12-month projection from:
 * 1. Actual data YTD (from cost model or manual actuals)
 * 2. Budget plan amount as the ceiling/reference
 * 3. Linear extrapolation from actuals YTD for remaining months
 */

export interface MonthlyDataPoint {
  month: number     // 1-12
  year: number
  label: string     // "Янв", "Фев", ...
  planned: number
  forecast: number
  actual: number    // 0 if not yet recorded
  isProjected: boolean // true for future months
}

const MONTH_LABELS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]

/**
 * Build a 12-month forecast projection.
 *
 * @param year             The budget year
 * @param totalPlanned     Full-year planned budget
 * @param totalActual      YTD actual (from cost model or manual)
 * @param currentMonth     Current month (1-12), actuals available up to this month
 * @param monthlyActuals   Optional map: month → actual amount (if known per-month)
 * @param monthlyPlanned   Optional map: month → planned amount per month
 */
export function buildMonthlyForecast(
  year: number,
  totalPlanned: number,
  totalActual: number,
  currentMonth: number,
  monthlyActuals?: Map<number, number>,
  monthlyPlanned?: Map<number, number>,
): MonthlyDataPoint[] {
  const points: MonthlyDataPoint[] = []

  // Monthly planned = even distribution if no per-month breakdown
  const defaultMonthlyPlanned = totalPlanned / 12

  // Actual run rate per month based on YTD
  const actualRunRate = currentMonth > 0 ? totalActual / currentMonth : 0

  for (let m = 1; m <= 12; m++) {
    const planned = monthlyPlanned?.get(m) ?? defaultMonthlyPlanned
    const isPast = m <= currentMonth
    const actual = isPast ? (monthlyActuals?.get(m) ?? (m === currentMonth ? totalActual - [...Array(currentMonth - 1)].reduce((s, _, i) => s + (monthlyActuals?.get(i + 1) ?? actualRunRate), 0) : actualRunRate)) : 0
    const forecast = isPast
      ? actual                           // Past = actual
      : actualRunRate > 0                // Future = extrapolate from run rate
        ? actualRunRate
        : planned                        // Fallback to plan

    points.push({
      month: m,
      year,
      label: MONTH_LABELS[m - 1],
      planned: Math.round(planned),
      forecast: Math.round(forecast),
      actual: isPast ? Math.round(actualRunRate) : 0,
      isProjected: !isPast,
    })
  }

  return points
}

/**
 * Calculate year-end projection from YTD actuals.
 * Simple linear extrapolation: (actual / monthsElapsed) * 12
 */
export function calcYearEndProjection(totalActual: number, currentMonth: number, totalMonths = 12): number {
  if (currentMonth <= 0) return 0
  return (totalActual / currentMonth) * totalMonths
}

/**
 * Variance analysis: compute price/volume decomposition
 * For FP&A: planned vs forecast vs actual
 */
export interface VarianceSummary {
  budgetVsForecast: number  // Forecast deviation from budget
  budgetVsActual: number    // Actual deviation from budget
  forecastVsActual: number  // Actual vs forecast
  budgetVsActualPct: number
  yearEndGap: number        // year-end projection vs budget
  isOnTrack: boolean        // actual within 10% of budget
}

export function computeVarianceSummary(
  totalPlanned: number,
  totalForecast: number,
  totalActual: number,
  yearEndProjection: number,
): VarianceSummary {
  const budgetVsForecast = totalPlanned - totalForecast
  const budgetVsActual = totalPlanned - totalActual
  const forecastVsActual = totalForecast - totalActual
  const budgetVsActualPct = totalPlanned > 0 ? (budgetVsActual / totalPlanned) * 100 : 0
  const yearEndGap = totalPlanned - yearEndProjection
  const isOnTrack = Math.abs(budgetVsActualPct) <= 10

  return {
    budgetVsForecast,
    budgetVsActual,
    forecastVsActual,
    budgetVsActualPct,
    yearEndGap,
    isOnTrack,
  }
}
