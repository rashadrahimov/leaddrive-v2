import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { loadAndCompute } from "@/lib/cost-model/db"
import { resolveCostModelKey } from "@/lib/budgeting/cost-model-map"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const [plan, lines, manualActuals] = await Promise.all([
    prisma.budgetPlan.findFirst({ where: { id: planId, organizationId: orgId } }),
    prisma.budgetLine.findMany({ where: { planId, organizationId: orgId } }),
    prisma.budgetActual.findMany({ where: { planId, organizationId: orgId } }),
  ])

  // Only load cost model if at least one line uses auto-actual (performance optimization)
  const hasAutoActual = lines.some((l: { isAutoActual: boolean }) => l.isAutoActual)
  const costModel = hasAutoActual ? await loadAndCompute(orgId).catch(() => null) : null

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  // Build effective actuals for auto-actual lines.
  // Simple: monthly cost model value × elapsed months in the plan period.
  // Q1 completed = ×3, Q2 just started (April) = ×1, Annual in March = ×3.
  const autoActualByCategory = new Map<string, number>()
  let autoActualTotal = 0

  if (hasAutoActual && costModel && plan) {
    const now = new Date()
    const curYear = now.getFullYear()
    const curMonth = now.getMonth() + 1

    let elapsedMonths = 1
    if (plan.periodType === "monthly") {
      elapsedMonths = 1
    } else if (plan.periodType === "quarterly" && plan.quarter) {
      const qStart = (plan.quarter - 1) * 3 + 1
      const qEnd = qStart + 2
      if (curYear > plan.year || (curYear === plan.year && curMonth > qEnd)) {
        elapsedMonths = 3 // quarter fully completed
      } else if (curYear === plan.year && curMonth >= qStart) {
        elapsedMonths = curMonth - qStart + 1 // inside quarter
      } else {
        elapsedMonths = 0 // quarter hasn't started
      }
    } else if (plan.periodType === "annual") {
      if (curYear > plan.year) {
        elapsedMonths = 12
      } else if (curYear === plan.year) {
        elapsedMonths = curMonth
      } else {
        elapsedMonths = 0
      }
    }

    for (const line of lines) {
      if (line.isAutoActual && line.costModelKey) {
        const monthlyAmount = resolveCostModelKey(costModel, line.costModelKey)
        const amount = monthlyAmount * elapsedMonths
        const key = `${line.category}||${line.lineType}`
        autoActualByCategory.set(key, (autoActualByCategory.get(key) ?? 0) + amount)
        autoActualTotal += amount
      }
    }
  }

  // Check if BudgetForecastEntry records exist — use them for totalForecast if so
  const forecastEntries = await prisma.budgetForecastEntry.findMany({
    where: { planId, organizationId: orgId },
  })

  // Totals — split by expense vs revenue vs cogs
  const expenseLines = lines.filter((l: { lineType: string }) => l.lineType === "expense")
  const revenueLines = lines.filter((l: { lineType: string }) => l.lineType === "revenue")
  const cogsLines = lines.filter((l: { lineType: string }) => l.lineType === "cogs")

  const totalExpensePlanned = expenseLines.reduce((s: number, l: { plannedAmount: number }) => s + l.plannedAmount, 0)
  const totalRevenuePlanned = revenueLines.reduce((s: number, l: { plannedAmount: number }) => s + l.plannedAmount, 0)
  const totalPlanned = totalExpensePlanned // KPI "ПЛАН" = only expenses
  const totalExpenseForecast = expenseLines.reduce((s: number, l: { forecastAmount: number | null; plannedAmount: number }) => s + (l.forecastAmount ?? l.plannedAmount), 0)
  const totalRevenueForecast = revenueLines.reduce((s: number, l: { forecastAmount: number | null; plannedAmount: number }) => s + (l.forecastAmount ?? l.plannedAmount), 0)
  const totalForecast = forecastEntries.length > 0
    ? forecastEntries.reduce((s: number, e: { forecastAmount: number }) => s + e.forecastAmount, 0)
    : totalExpenseForecast // KPI "ПРОГНОЗ" = only expenses
  const manualActualTotal = manualActuals.reduce((s: number, a: { actualAmount: number }) => s + a.actualAmount, 0)

  // COGS totals
  const totalCOGSPlanned = cogsLines.reduce((s: number, l: { plannedAmount: number }) => s + l.plannedAmount, 0)
  const totalCOGSForecast = cogsLines.reduce((s: number, l: { forecastAmount: number | null; plannedAmount: number }) => s + (l.forecastAmount ?? l.plannedAmount), 0)

  // Split auto-actuals by type (expense, revenue, cogs) — iterate map keys to avoid double-counting
  let autoActualExpense = 0
  let autoActualRevenue = 0
  let autoActualCOGS = 0
  for (const [key, amount] of autoActualByCategory) {
    const lineType = key.split("||")[1] ?? "expense"
    if (lineType === "revenue") autoActualRevenue += amount
    else if (lineType === "cogs") autoActualCOGS += amount
    else autoActualExpense += amount
  }

  // Split manual actuals by type
  let manualExpenseActual = 0
  let manualRevenueActual = 0
  let manualCOGSActual = 0
  for (const a of manualActuals) {
    if (a.lineType === "revenue") manualRevenueActual += a.actualAmount
    else if (a.lineType === "cogs") manualCOGSActual += a.actualAmount
    else manualExpenseActual += a.actualAmount
  }

  const totalExpenseActual = autoActualExpense > 0 ? autoActualExpense : manualExpenseActual
  const totalRevenueActual = autoActualRevenue > 0 ? autoActualRevenue : manualRevenueActual
  const totalCOGSActual = autoActualCOGS > 0 ? autoActualCOGS : manualCOGSActual
  const totalActual = totalExpenseActual

  // Financial KPIs — correct P&L chain
  const grossProfitPlanned = totalRevenuePlanned - totalCOGSPlanned
  const grossProfitActual = totalRevenueActual - totalCOGSActual
  const marginPlanned = grossProfitPlanned - totalExpensePlanned  // Operating Profit
  const marginActual = grossProfitActual - totalExpenseActual
  const totalVariance = marginActual - marginPlanned // positive = better than plan
  const executionPct = marginPlanned !== 0 ? (marginActual / marginPlanned) * 100 : 0
  const forecastVariance = totalExpenseForecast - totalExpenseActual

  // Estimate period-end projection based on elapsed time within the plan's period
  const nowDate = new Date()
  const currentMonthNum = nowDate.getMonth() + 1
  const periodMonths = plan.periodType === "annual" ? 12 : plan.periodType === "quarterly" ? 3 : 1
  // For annual: months elapsed = currentMonth. For quarterly: months elapsed within the quarter.
  // For monthly: always 1.
  let monthsElapsed = 1
  if (plan.periodType === "annual") {
    monthsElapsed = Math.max(1, currentMonthNum)
  } else if (plan.periodType === "quarterly" && plan.quarter) {
    const quarterStartMonth = (plan.quarter - 1) * 3 + 1
    monthsElapsed = Math.max(1, Math.min(3, currentMonthNum - quarterStartMonth + 1))
  }
  const yearEndProjection = totalActual > 0 ? (totalActual / monthsElapsed) * periodMonths : totalForecast

  // Build parent lookup: childCategory → parentCategory
  const parentLookup = new Map<string, string>()
  for (const l of lines) {
    if (!l.parentId) {
      // This is a parent line — register its children
      const children = lines.filter((c: any) => c.parentId === l.id)
      for (const c of children) {
        parentLookup.set(`${c.category}||${c.lineType}`, l.category)
      }
    }
  }

  // By category — merge lines, auto-actuals, and manual actuals
  const categoryMap = new Map<string, { planned: number; forecast: number; actual: number; lineType: string }>()

  for (const l of lines) {
    const key = `${l.category}||${l.lineType}`
    const existing = categoryMap.get(key) ?? { planned: 0, forecast: 0, actual: 0, lineType: l.lineType }
    existing.planned += l.plannedAmount
    existing.forecast += l.forecastAmount ?? l.plannedAmount
    categoryMap.set(key, existing)
  }

  // Apply auto-actuals first
  for (const [key, amount] of autoActualByCategory) {
    const lineType = key.split("||")[1] ?? "expense"
    const existing = categoryMap.get(key) ?? { planned: 0, forecast: 0, actual: 0, lineType }
    existing.actual += amount
    categoryMap.set(key, existing)
  }

  // Apply manual actuals for lines without auto-actual
  for (const a of manualActuals) {
    const key = `${a.category}||${a.lineType}`
    // Skip if auto-actual already covers this category
    if (autoActualByCategory.has(key)) continue
    const existing = categoryMap.get(key) ?? { planned: 0, forecast: 0, actual: 0, lineType: a.lineType }
    existing.actual += a.actualAmount
    categoryMap.set(key, existing)
  }

  const byCategory = Array.from(categoryMap.entries()).map(([key, val]) => {
    const [category, lineType] = key.split("||")
    const variance = lineType === "revenue"
      ? val.actual - val.planned
      : val.planned - val.actual
    const variancePct = val.planned > 0 ? (variance / val.planned) * 100 : 0
    const parentCategory = parentLookup.get(key) ?? null
    return { category, lineType, planned: val.planned, forecast: val.forecast, actual: val.actual, variance, variancePct, parentCategory }
  })

  // By department — track expense and revenue separately for correct variance
  const deptMap = new Map<string, { expPlanned: number; expActual: number; revPlanned: number; revActual: number; forecast: number }>()

  for (const l of lines) {
    const dept = l.department || "Общие"
    const existing = deptMap.get(dept) ?? { expPlanned: 0, expActual: 0, revPlanned: 0, revActual: 0, forecast: 0 }
    existing.forecast += l.forecastAmount ?? l.plannedAmount
    if (l.lineType === "revenue") {
      existing.revPlanned += l.plannedAmount
    } else {
      existing.expPlanned += l.plannedAmount
    }
    deptMap.set(dept, existing)
  }

  // Apply auto-actuals to departments (resolve from lines that have isAutoActual + costModelKey)
  if (costModel) {
    for (const line of lines) {
      if (line.isAutoActual && line.costModelKey) {
        const dept = line.department || "Общие"
        const amount = resolveCostModelKey(costModel, line.costModelKey)
        const existing = deptMap.get(dept) ?? { expPlanned: 0, expActual: 0, revPlanned: 0, revActual: 0, forecast: 0 }
        if (line.lineType === "revenue") {
          existing.revActual += amount
        } else {
          existing.expActual += amount
        }
        deptMap.set(dept, existing)
      }
    }
  }

  // Apply manual actuals for departments (skip categories covered by auto-actual)
  for (const a of manualActuals) {
    const catKey = `${a.category}||${a.lineType}`
    if (autoActualByCategory.has(catKey)) continue
    const dept = a.department || "Общие"
    const existing = deptMap.get(dept) ?? { expPlanned: 0, expActual: 0, revPlanned: 0, revActual: 0, forecast: 0 }
    if (a.lineType === "revenue") {
      existing.revActual += a.actualAmount
    } else {
      existing.expActual += a.actualAmount
    }
    deptMap.set(dept, existing)
  }

  const byDepartment = Array.from(deptMap.entries()).map(([department, val]) => {
    const planned = val.expPlanned + val.revPlanned
    const actual = val.expActual + val.revActual
    // Variance: expense savings + revenue overperformance = positive
    const expVariance = val.expPlanned - val.expActual   // positive = under budget (good)
    const revVariance = val.revActual - val.revPlanned    // positive = over target (good)
    return {
      department,
      planned,
      forecast: val.forecast,
      actual,
      variance: expVariance + revVariance,
    }
  })

  // Expense execution % — how much of expense budget was spent (>100% = overspend)
  const expenseExecutionPct = totalExpensePlanned > 0 ? (totalExpenseActual / totalExpensePlanned) * 100 : 0

  // Elapsed time % within the plan period (for time-aware execution indicator)
  let elapsedPct = 100
  if (plan.status !== "closed") {
    const now = new Date()
    const cy = now.getFullYear()
    const cm = now.getMonth() + 1
    const cd = now.getDate()
    const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

    if (plan.periodType === "monthly" && plan.month) {
      if (cy > plan.year || (cy === plan.year && cm > plan.month)) {
        elapsedPct = 100
      } else if (cy === plan.year && cm === plan.month) {
        elapsedPct = (cd / daysInMonth(cy, cm)) * 100
      } else {
        elapsedPct = 0
      }
    } else if (plan.periodType === "quarterly" && plan.quarter) {
      const qStart = (plan.quarter - 1) * 3 + 1
      const qEnd = qStart + 2
      if (cy > plan.year || (cy === plan.year && cm > qEnd)) {
        elapsedPct = 100
      } else if (cy === plan.year && cm >= qStart && cm <= qEnd) {
        const monthsFullyDone = cm - qStart
        const dayFraction = cd / daysInMonth(cy, cm)
        elapsedPct = ((monthsFullyDone + dayFraction) / 3) * 100
      } else {
        elapsedPct = 0
      }
    } else if (plan.periodType === "annual") {
      if (cy > plan.year) {
        elapsedPct = 100
      } else if (cy === plan.year) {
        const monthsFullyDone = cm - 1
        const dayFraction = cd / daysInMonth(cy, cm)
        elapsedPct = ((monthsFullyDone + dayFraction) / 12) * 100
      } else {
        elapsedPct = 0
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      plan,
      totalPlanned,
      totalForecast,
      totalActual,
      totalVariance,
      forecastVariance,
      executionPct,
      expenseExecutionPct,
      elapsedPct: Math.round(elapsedPct * 10) / 10,
      autoActualTotal,
      yearEndProjection,
      // Revenue totals (separate from expense KPIs)
      totalRevenuePlanned,
      totalRevenueForecast,
      totalRevenueActual,
      totalExpensePlanned,
      totalExpenseForecast,
      totalExpenseActual,
      margin: marginPlanned,
      marginActual: marginActual,
      totalCOGSPlanned,
      totalCOGSForecast,
      totalCOGSActual,
      grossProfit: grossProfitPlanned,
      grossProfitActual,
      byCategory,
      byDepartment,
      costModelTotal: costModel?.grandTotalG ?? 0,
    },
  })
}
