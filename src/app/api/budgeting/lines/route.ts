import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const lines = await prisma.budgetLine.findMany({
    where: { planId, organizationId: orgId },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }],
  })

  return NextResponse.json({ success: true, data: lines })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { plan_id, planId, category, department, line_type, lineType, planned_amount, plannedAmount, forecastAmount, costModelKey, isAutoActual, notes } = body

  const resolvedPlanId = planId || plan_id
  const resolvedLineType = lineType || line_type || "expense"
  const resolvedAmount = plannedAmount ?? planned_amount ?? 0

  if (!resolvedPlanId || !category) {
    return NextResponse.json({ error: "planId and category are required" }, { status: 400 })
  }

  const line = await prisma.budgetLine.create({
    data: {
      organizationId: orgId,
      planId: resolvedPlanId,
      category,
      department: department || null,
      lineType: resolvedLineType,
      plannedAmount: Number(resolvedAmount),
      forecastAmount: forecastAmount != null ? Number(forecastAmount) : null,
      costModelKey: costModelKey || null,
      isAutoActual: isAutoActual === true,
      notes: notes || null,
    },
  })

  return NextResponse.json({ success: true, data: line }, { status: 201 })
}
