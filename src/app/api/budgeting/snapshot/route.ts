/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/budgeting/snapshot?planId=X&at=ISO_TIMESTAMP
 *
 * Reconstructs the budget state at a given point in time using
 * the BudgetChangeLog. Uses DISTINCT ON for O(1) reconstruction.
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  const at = req.nextUrl.searchParams.get("at")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })
  if (!at) return NextResponse.json({ error: "at (ISO timestamp) required" }, { status: 400 })

  const atDate = new Date(at)

  // Get the latest changelog entry per entity at or before the given timestamp
  // Using raw SQL with DISTINCT ON for performance
  const latestEntries: any[] = await prisma.$queryRaw`
    SELECT DISTINCT ON ("entityId")
      "entityId", "entityType", "action", "snapshot", "createdAt"
    FROM budget_change_logs
    WHERE "planId" = ${planId}
      AND "organizationId" = ${orgId}
      AND "createdAt" <= ${atDate}
    ORDER BY "entityId", "createdAt" DESC
  `

  // Separate by entity type, exclude deleted entities
  const lines: any[] = []
  const actuals: any[] = []
  const forecasts: any[] = []

  for (const entry of latestEntries) {
    if (entry.action === "delete") continue // entity was deleted at this point
    const snapshot = entry.snapshot
    if (!snapshot) continue

    switch (entry.entityType) {
      case "line":
        lines.push(snapshot)
        break
      case "actual":
        actuals.push(snapshot)
        break
      case "forecast":
        forecasts.push(snapshot)
        break
    }
  }

  // Compute basic analytics from reconstructed state
  const analytics = computeAnalytics(lines, actuals)

  return NextResponse.json({
    success: true,
    data: { lines, actuals, forecasts, analytics, reconstructedAt: at },
  })
}

function computeAnalytics(lines: any[], actuals: any[]) {
  // Aggregate by category for actuals
  const actualsByCat = new Map<string, number>()
  for (const a of actuals) {
    const key = `${a.category}||${a.lineType}`
    actualsByCat.set(key, (actualsByCat.get(key) || 0) + Number(a.actualAmount || 0))
  }

  let totalExpensePlanned = 0, totalExpenseActual = 0
  let totalRevenuePlanned = 0, totalRevenueActual = 0
  let totalCOGSPlanned = 0, totalCOGSActual = 0

  const byCategory: any[] = []

  for (const l of lines) {
    const planned = Number(l.plannedAmount || 0)
    const forecast = l.forecastAmount != null ? Number(l.forecastAmount) : planned
    const actual = actualsByCat.get(`${l.category}||${l.lineType}`) || 0

    if (l.lineType === "expense") {
      totalExpensePlanned += planned
      totalExpenseActual += actual
    } else if (l.lineType === "revenue") {
      totalRevenuePlanned += planned
      totalRevenueActual += actual
    } else if (l.lineType === "cogs") {
      totalCOGSPlanned += planned
      totalCOGSActual += actual
    }

    byCategory.push({
      category: l.category,
      lineType: l.lineType,
      planned,
      forecast,
      actual,
      variance: actual - planned,
      variancePct: planned !== 0 ? ((actual - planned) / planned) * 100 : 0,
    })
  }

  const totalPlanned = totalExpensePlanned + totalCOGSPlanned
  const totalActual = totalExpenseActual + totalCOGSActual
  const margin = totalRevenuePlanned - totalPlanned
  const marginActual = totalRevenueActual - totalActual

  return {
    totalPlanned,
    totalActual,
    totalVariance: totalActual - totalPlanned,
    totalExpensePlanned,
    totalExpenseActual,
    totalRevenuePlanned,
    totalRevenueActual,
    totalCOGSPlanned,
    totalCOGSActual,
    margin,
    marginActual,
    executionPct: totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0,
    expenseExecutionPct: totalExpensePlanned > 0 ? (totalExpenseActual / totalExpensePlanned) * 100 : 0,
    revenueExecutionPct: totalRevenuePlanned > 0 ? (totalRevenueActual / totalRevenuePlanned) * 100 : 0,
    byCategory,
  }
}
