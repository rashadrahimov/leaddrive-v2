import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma, logBudgetChange } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const entries = await prisma.budgetForecastEntry.findMany({
    where: { planId, organizationId: orgId },
    orderBy: [{ year: "asc" }, { month: "asc" }, { category: "asc" }],
  })

  return NextResponse.json({ success: true, data: entries })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Check plan is not approved (use first entry's planId)
  const firstPlanId = Array.isArray(body.entries) ? body.entries[0]?.planId : body.planId
  if (firstPlanId) {
    const plan = await prisma.budgetPlan.findFirst({ where: { id: firstPlanId, organizationId: orgId }, select: { status: true } })
    if (plan?.status === "approved") {
      return NextResponse.json({ error: "План утверждён — изменения запрещены" }, { status: 403 })
    }
  }

  // Supports bulk upsert: body.entries = [{ planId, month, year, category, lineType, forecastAmount }]
  const entries: Array<{ planId: string; month: number; year: number; category: string; lineType?: string; forecastAmount: number }> =
    Array.isArray(body.entries) ? body.entries : [body]

  const results = []
  for (const entry of entries) {
    const { planId, month, year, category, lineType, forecastAmount } = entry
    if (!planId || !month || !year || !category) continue
    const lt = lineType || "expense"

    const existing = await prisma.budgetForecastEntry.findUnique({
      where: { planId_year_month_category_lineType: { planId, year, month, category, lineType: lt } },
    })

    const upserted = await prisma.budgetForecastEntry.upsert({
      where: { planId_year_month_category_lineType: { planId, year, month, category, lineType: lt } },
      update: { forecastAmount: Number(forecastAmount) ?? 0 },
      create: {
        organizationId: orgId,
        planId,
        month,
        year,
        category,
        lineType: lt,
        forecastAmount: Number(forecastAmount) ?? 0,
      },
    })

    logBudgetChange({
      orgId,
      planId,
      entityType: "forecast",
      entityId: upserted.id,
      action: existing ? "update" : "create",
      field: existing ? "forecastAmount" : undefined,
      oldValue: existing?.forecastAmount ?? undefined,
      newValue: upserted.forecastAmount,
      snapshot: upserted,
    })

    results.push(upserted)
  }

  return NextResponse.json({ success: true, data: results }, { status: 201 })
}
