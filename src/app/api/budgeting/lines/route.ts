import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  // Return top-level lines with nested children
  const lines = await prisma.budgetLine.findMany({
    where: { planId, organizationId: orgId, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { category: "asc" }],
    include: {
      children: {
        orderBy: [{ sortOrder: "asc" }, { category: "asc" }],
      },
    },
  })

  return NextResponse.json({ success: true, data: lines })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { plan_id, planId, category, department, line_type, lineType, lineSubtype, planned_amount, plannedAmount, forecastAmount, unitPrice, unitCost, quantity, costModelKey, isAutoActual, notes, parentId } = body

  const resolvedPlanId = planId || plan_id
  const resolvedLineType = lineType || line_type || "expense"
  const resolvedAmount = plannedAmount ?? planned_amount ?? 0

  if (!resolvedPlanId || !category) {
    return NextResponse.json({ error: "planId and category are required" }, { status: 400 })
  }

  // Check plan is not approved
  const plan = await prisma.budgetPlan.findFirst({ where: { id: resolvedPlanId, organizationId: orgId } })
  if (plan?.status === "approved") {
    return NextResponse.json({ error: "План утверждён — изменения запрещены" }, { status: 403 })
  }

  if (Number(resolvedAmount) < 0) {
    return NextResponse.json({ error: "Сумма не может быть отрицательной" }, { status: 400 })
  }

  if (forecastAmount != null && Number(forecastAmount) < 0) {
    return NextResponse.json({ error: "Прогнозная сумма не может быть отрицательной" }, { status: 400 })
  }

  const line = await prisma.budgetLine.create({
    data: {
      organizationId: orgId,
      planId: resolvedPlanId,
      category,
      department: department || null,
      lineType: resolvedLineType,
      lineSubtype: lineSubtype || null,
      plannedAmount: Number(resolvedAmount),
      forecastAmount: forecastAmount != null ? Number(forecastAmount) : null,
      unitPrice: unitPrice != null ? Number(unitPrice) : null,
      unitCost: unitCost != null ? Number(unitCost) : null,
      quantity: quantity != null ? Number(quantity) : null,
      costModelKey: costModelKey || null,
      isAutoActual: isAutoActual === true,
      notes: notes || null,
      parentId: parentId || null,
    },
  })

  return NextResponse.json({ success: true, data: line }, { status: 201 })
}
