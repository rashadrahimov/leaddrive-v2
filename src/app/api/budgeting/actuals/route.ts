import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const actuals = await prisma.budgetActual.findMany({
    where: { planId, organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: actuals })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { plan_id, planId, category, department, line_type, lineType, actual_amount, actualAmount, expenseDate, expense_date, description } = body

  const resolvedPlanId = planId || plan_id
  const resolvedLineType = lineType || line_type || "expense"
  const resolvedAmount = actualAmount ?? actual_amount ?? 0
  const resolvedDate = expenseDate || expense_date

  if (!resolvedPlanId || !category) {
    return NextResponse.json({ error: "planId and category are required" }, { status: 400 })
  }

  const actual = await prisma.budgetActual.create({
    data: {
      organizationId: orgId,
      planId: resolvedPlanId,
      category,
      department: department || null,
      lineType: resolvedLineType,
      actualAmount: Number(resolvedAmount),
      expenseDate: resolvedDate || null,
      description: description || null,
    },
  })

  return NextResponse.json({ success: true, data: actual }, { status: 201 })
}
