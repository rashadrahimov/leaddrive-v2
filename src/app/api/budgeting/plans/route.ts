import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { loadAndCompute } from "@/lib/cost-model/db"

const DEPT_CATEGORY_MAP: Record<string, string> = {
  it: "Выручка — Daimi IT", infosec: "Выручка — InfoSec",
  erp: "Выручка — ERP", grc: "Выручка — GRC", pm: "Выручка — PM",
  helpdesk: "Выручка — HelpDesk", cloud: "Выручка — Cloud", waf: "Выручка — WAF",
}

function getPeriodMonths(periodType: string, quarter?: number | null, month?: number | null): number[] {
  if (periodType === "annual") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  if (periodType === "quarterly" && quarter) {
    const start = (quarter - 1) * 3 + 1
    return [start, start + 1, start + 2]
  }
  if (periodType === "monthly" && month) return [month]
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const plans = await prisma.budgetPlan.findMany({
    where: { organizationId: orgId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })

  return NextResponse.json({ success: true, data: plans })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, periodType, year, month, quarter, notes } = body

  if (!name || !periodType || !year) {
    return NextResponse.json({ error: "name, periodType, year are required" }, { status: 400 })
  }

  const y = Number(year)
  if (y < 2020 || y > 2050) {
    return NextResponse.json({ error: "Год должен быть от 2020 до 2050" }, { status: 400 })
  }
  if (month && (Number(month) < 1 || Number(month) > 12)) {
    return NextResponse.json({ error: "Месяц должен быть от 1 до 12" }, { status: 400 })
  }
  if (quarter && (Number(quarter) < 1 || Number(quarter) > 4)) {
    return NextResponse.json({ error: "Квартал должен быть от 1 до 4" }, { status: 400 })
  }
  if (!["monthly", "quarterly", "annual"].includes(periodType)) {
    return NextResponse.json({ error: "periodType должен быть monthly, quarterly или annual" }, { status: 400 })
  }

  // Check for duplicate plan in same period
  const duplicate = await prisma.budgetPlan.findFirst({
    where: {
      organizationId: orgId,
      periodType,
      year: Number(year),
      ...(month ? { month: Number(month) } : {}),
      ...(quarter ? { quarter: Number(quarter) } : {}),
    },
  })
  if (duplicate) {
    return NextResponse.json({ error: `План для этого периода уже существует: "${duplicate.name}"` }, { status: 409 })
  }

  const plan = await prisma.budgetPlan.create({
    data: {
      organizationId: orgId,
      name,
      periodType,
      year: Number(year),
      month: month ? Number(month) : null,
      quarter: quarter ? Number(quarter) : null,
      notes: notes || null,
    },
  })

  // Auto-populate: clone lines from existing plan + fill from sales forecast & cost model
  try {
    const planYear = Number(year)
    const planMonths = getPeriodMonths(periodType, quarter ? Number(quarter) : null, month ? Number(month) : null)

    // Clone budget line structure from any existing plan
    const sourcePlan = await prisma.budgetPlan.findFirst({
      where: { organizationId: orgId, id: { not: plan.id }, isRolling: false },
      orderBy: { createdAt: "asc" },
    })

    if (sourcePlan) {
      const sourceLines = await prisma.budgetLine.findMany({ where: { planId: sourcePlan.id } })
      const costModel = await loadAndCompute(orgId)

      // Load sales forecast for revenue (user's Excel forecast)
      const salesForecasts = await prisma.salesForecast.findMany({
        where: { organizationId: orgId, year: planYear, month: { in: planMonths } },
        include: { budgetDept: { select: { key: true } } },
      })

      // Sum forecast by department key for the plan's months
      const forecastByDept: Record<string, number> = {}
      for (const sf of salesForecasts) {
        const key = sf.budgetDept.key
        forecastByDept[key] = (forecastByDept[key] || 0) + sf.amount
      }

      for (const sl of sourceLines) {
        let plannedAmount = 0

        if (sl.lineType === "revenue") {
          // Revenue: from SalesForecast (user's Excel data)
          for (const [deptKey, category] of Object.entries(DEPT_CATEGORY_MAP)) {
            if (sl.category === category) {
              plannedAmount = forecastByDept[deptKey] ?? 0
              break
            }
          }
        } else if (sl.costModelKey) {
          // Expenses: from cost model × number of months
          const parts = sl.costModelKey.split(".")
          if (parts[0] === "serviceDetails" && parts.length === 3) {
            const detail = costModel.serviceDetails[parts[1]]
            if (detail && parts[2] in detail) {
              plannedAmount = ((detail as any)[parts[2]] ?? 0) * planMonths.length
            }
          }
        }

        await prisma.budgetLine.create({
          data: {
            organizationId: orgId, planId: plan.id, category: sl.category,
            department: sl.department, lineType: sl.lineType,
            plannedAmount: Math.round(plannedAmount * 100) / 100,
            costModelKey: sl.costModelKey,
            isAutoActual: false, isAutoPlanned: false,
            notes: sl.notes, sortOrder: sl.sortOrder,
            lineSubtype: sl.lineSubtype, parentId: null,
          },
        })
      }
    }
  } catch (e) {
    console.error("Auto-populate plan error:", e)
  }

  return NextResponse.json({ success: true, data: plan }, { status: 201 })
}
