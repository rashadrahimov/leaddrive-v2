import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { loadAndCompute } from "@/lib/cost-model/db"

const createPlanSchema = z.object({
  name: z.string().min(1).max(500),
  periodType: z.enum(["monthly", "quarterly", "annual"]),
  year: z.number().int().min(2020).max(2050),
  month: z.number().int().min(1).max(12).optional().nullable(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
}).strict()

const DEPT_CATEGORY_MAP: Record<string, string> = {
  it: "Daimi IT", infosec: "InfoSec",
  erp: "ERP", grc: "GRC", pm: "PM",
  helpdesk: "HelpDesk", cloud: "Cloud", waf: "WAF",
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

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let data
  try {
    data = createPlanSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { name, periodType, year, month, quarter, notes } = data

  // Check for duplicate plan in same period
  const duplicate = await prisma.budgetPlan.findFirst({
    where: {
      organizationId: orgId,
      periodType,
      year,
      ...(month ? { month } : {}),
      ...(quarter ? { quarter } : {}),
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
      year,
      month: month ?? null,
      quarter: quarter ?? null,
      notes: notes || null,
    },
  })

  // Auto-populate: clone lines from existing plan + fill from sales forecast & cost model
  try {
    const planYear = year
    const planMonths = getPeriodMonths(periodType, quarter ?? null, month ?? null)

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

      // Clone parent lines first, then children with mapped parentId
      const parentLines = sourceLines.filter(sl => !sl.parentId)
      const childLines = sourceLines.filter(sl => sl.parentId)
      const idMapping = new Map<string, string>() // oldId → newId

      for (const sl of parentLines) {
        let plannedAmount = 0

        if (sl.lineType === "revenue") {
          for (const [deptKey, category] of Object.entries(DEPT_CATEGORY_MAP)) {
            if (sl.category === category) {
              plannedAmount = forecastByDept[deptKey] ?? 0
              break
            }
          }
        } else if (sl.costModelKey) {
          const parts = sl.costModelKey.split(".")
          if (parts[0] === "serviceDetails" && parts.length === 3) {
            const detail = costModel.serviceDetails[parts[1]]
            if (detail && parts[2] in detail) {
              plannedAmount = ((detail as any)[parts[2]] ?? 0) * planMonths.length
            }
          }
        }

        const created = await prisma.budgetLine.create({
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
        idMapping.set(sl.id, created.id)
      }

      for (const sl of childLines) {
        let plannedAmount = 0

        if (sl.costModelKey) {
          const parts = sl.costModelKey.split(".")
          if (parts[0] === "serviceDetails" && parts.length === 3) {
            const detail = costModel.serviceDetails[parts[1]]
            if (detail && parts[2] in detail) {
              plannedAmount = ((detail as any)[parts[2]] ?? 0) * planMonths.length
            }
          }
        } else {
          plannedAmount = sl.plannedAmount
        }

        const newParentId = sl.parentId ? idMapping.get(sl.parentId) ?? null : null
        await prisma.budgetLine.create({
          data: {
            organizationId: orgId, planId: plan.id, category: sl.category,
            department: sl.department, lineType: sl.lineType,
            plannedAmount: Math.round(plannedAmount * 100) / 100,
            costModelKey: sl.costModelKey,
            isAutoActual: false, isAutoPlanned: false,
            notes: sl.notes, sortOrder: sl.sortOrder,
            lineSubtype: sl.lineSubtype, parentId: newParentId,
          },
        })
      }
    }
  } catch (e) {
    console.error("Auto-populate plan error:", e)
  }

  return NextResponse.json({ success: true, data: plan }, { status: 201 })
}
