import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { loadAndCompute } from "@/lib/cost-model/db"

const SVC_REVENUE_MAP: Record<string, string> = {
  permanent_it: "Выручка — Daimi IT", infosec: "Выручка — InfoSec",
  erp: "Выручка — ERP", grc: "Выручка — GRC", projects: "Выручка — PM",
  helpdesk: "Выручка — HelpDesk", cloud: "Выручка — Cloud", waf: "Выручка — WAF",
}

// POST — create a rolling forecast plan with 12 months + auto-populate from cost model
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, startYear, startMonth, rollingMonths = 12 } = body

  if (!name || !startYear || !startMonth) {
    return NextResponse.json({ error: "name, startYear, startMonth required" }, { status: 400 })
  }

  // Create rolling plan
  const plan = await prisma.budgetPlan.create({
    data: {
      organizationId: orgId,
      name,
      periodType: "monthly",
      year: startYear,
      month: startMonth,
      isRolling: true,
      rollingMonths,
      status: "draft",
    },
  })

  // Create month entries
  const monthEntries: { organizationId: string; planId: string; year: number; month: number; status: string }[] = []
  let y = startYear
  let m = startMonth
  for (let i = 0; i < rollingMonths; i++) {
    monthEntries.push({ organizationId: orgId, planId: plan.id, year: y, month: m, status: "forecast" })
    m++
    if (m > 12) { m = 1; y++ }
  }
  await prisma.rollingForecastMonth.createMany({ data: monthEntries })

  // Auto-populate: clone budget lines from existing plan
  const sourcePlan = await prisma.budgetPlan.findFirst({
    where: { organizationId: orgId, id: { not: plan.id }, isRolling: false },
    orderBy: { createdAt: "asc" },
  })

  if (sourcePlan) {
    const sourceLines = await prisma.budgetLine.findMany({ where: { planId: sourcePlan.id } })
    for (const sl of sourceLines) {
      await prisma.budgetLine.create({
        data: {
          organizationId: orgId, planId: plan.id, category: sl.category,
          department: sl.department, lineType: sl.lineType,
          plannedAmount: 0, costModelKey: sl.costModelKey,
          isAutoActual: false, isAutoPlanned: false,
          notes: sl.notes, sortOrder: sl.sortOrder,
          lineSubtype: sl.lineSubtype, parentId: null,
        },
      })
    }
  }

  // Auto-populate: fill forecast entries from cost model for all 12 months
  try {
    const costModel = await loadAndCompute(orgId)
    const lines = await prisma.budgetLine.findMany({ where: { planId: plan.id } })
    const forecastEntries: any[] = []

    for (const line of lines) {
      let monthlyAmount = 0

      if (line.lineType === "revenue") {
        // Find matching service revenue
        for (const [svc, category] of Object.entries(SVC_REVENUE_MAP)) {
          if (line.category === category) {
            monthlyAmount = costModel.serviceRevenues[svc] ?? 0
            break
          }
        }
      } else if (line.costModelKey) {
        // Expense: resolve from cost model
        const parts = line.costModelKey.split(".")
        if (parts[0] === "serviceDetails" && parts.length === 3) {
          const detail = costModel.serviceDetails[parts[1]]
          if (detail && parts[2] in detail) {
            monthlyAmount = (detail as any)[parts[2]] ?? 0
          }
        }
      }

      if (monthlyAmount > 0) {
        for (const me of monthEntries) {
          forecastEntries.push({
            organizationId: orgId,
            planId: plan.id,
            year: me.year,
            month: me.month,
            category: line.category,
            lineType: line.lineType,
            forecastAmount: Math.round(monthlyAmount * 100) / 100,
          })
        }
      }
    }

    if (forecastEntries.length > 0) {
      await prisma.budgetForecastEntry.createMany({ data: forecastEntries })
    }
  } catch (e) {
    // Cost model may not exist for this org — plan still created, just without forecasts
    console.error("Rolling auto-populate forecast error:", e)
  }

  return NextResponse.json({ success: true, data: plan }, { status: 201 })
}

// PATCH — close a rolling forecast month (mark as actual)
export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { planId, year, month } = await req.json()
  if (!planId || !year || !month) {
    return NextResponse.json({ error: "planId, year, month required" }, { status: 400 })
  }

  // Verify plan belongs to org
  const plan = await prisma.budgetPlan.findFirst({
    where: { id: planId, organizationId: orgId, isRolling: true },
  })
  if (!plan) return NextResponse.json({ error: "Rolling plan not found" }, { status: 404 })

  // Close the month
  const updated = await prisma.rollingForecastMonth.update({
    where: { planId_year_month: { planId, year, month } },
    data: { status: "actual", lockedAt: new Date() },
  })

  // Add a new month at the end (true rolling behavior)
  const allMonths = await prisma.rollingForecastMonth.findMany({
    where: { planId, organizationId: orgId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  })
  const last = allMonths[allMonths.length - 1]
  let nextYear = last.year
  let nextMonth = last.month + 1
  if (nextMonth > 12) { nextMonth = 1; nextYear++ }

  // Only add if this month doesn't already exist
  const exists = await prisma.rollingForecastMonth.findUnique({
    where: { planId_year_month: { planId, year: nextYear, month: nextMonth } },
  })
  if (!exists) {
    await prisma.rollingForecastMonth.create({
      data: { organizationId: orgId, planId, year: nextYear, month: nextMonth, status: "forecast" },
    })
  }

  return NextResponse.json({ success: true, data: updated })
}

// GET — get rolling forecast data (blended actuals + forecast)
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const plan = await prisma.budgetPlan.findFirst({
    where: { id: planId, organizationId: orgId, isRolling: true },
  })
  if (!plan) return NextResponse.json({ error: "Rolling plan not found" }, { status: 404 })

  const months = await prisma.rollingForecastMonth.findMany({
    where: { planId, organizationId: orgId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  })

  // Get actuals and forecast entries for these months
  const lines = await prisma.budgetLine.findMany({
    where: { planId, organizationId: orgId },
  })

  const actuals = await prisma.budgetActual.findMany({
    where: { planId, organizationId: orgId },
  })

  const forecasts = await prisma.budgetForecastEntry.findMany({
    where: { planId, organizationId: orgId },
  })

  // Build blended data per month
  const blended = months.map((m) => {
    const isActual = m.status === "actual"
    const monthActuals = actuals.filter((a) => {
      if (!a.expenseDate) return false
      const d = new Date(a.expenseDate)
      return d.getFullYear() === m.year && d.getMonth() + 1 === m.month
    })
    const monthForecasts = forecasts.filter((f) => f.year === m.year && f.month === m.month)

    const actualTotal = monthActuals.reduce((s, a) => s + a.actualAmount, 0)
    const forecastTotal = monthForecasts.reduce((s, f) => s + f.forecastAmount, 0)

    return {
      year: m.year,
      month: m.month,
      status: m.status,
      lockedAt: m.lockedAt,
      actualTotal: isActual ? actualTotal : 0,
      forecastTotal: isActual ? 0 : forecastTotal,
      total: isActual ? actualTotal : forecastTotal,
    }
  })

  return NextResponse.json({
    plan,
    months: blended,
    lineCount: lines.length,
    totalActual: blended.reduce((s, m) => s + m.actualTotal, 0),
    totalForecast: blended.reduce((s, m) => s + m.forecastTotal, 0),
  })
}
