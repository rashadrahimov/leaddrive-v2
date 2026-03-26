import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// POST — create a rolling forecast plan with 12 months
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
  const months = []
  let y = startYear
  let m = startMonth
  for (let i = 0; i < rollingMonths; i++) {
    months.push({
      organizationId: orgId,
      planId: plan.id,
      year: y,
      month: m,
      status: "forecast",
    })
    m++
    if (m > 12) { m = 1; y++ }
  }

  await prisma.rollingForecastMonth.createMany({ data: months })

  return NextResponse.json({ success: true, data: plan }, { status: 201 })
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
