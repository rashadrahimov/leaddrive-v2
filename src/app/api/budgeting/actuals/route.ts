import { NextRequest, NextResponse } from "next/server"
import { getOrgId, getSession } from "@/lib/api-auth"
import { prisma, logBudgetChange } from "@/lib/prisma"
import { buildDeptFilter } from "@/lib/budgeting/department-access"
import type { Role } from "@/lib/permissions"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { orgId, userId, role } = session

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  // Department access filter
  const deptFilter = await buildDeptFilter(orgId, userId, role as Role)

  const actuals = await prisma.budgetActual.findMany({
    where: { planId, organizationId: orgId, ...deptFilter },
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

  // Check plan is not approved
  const plan = await prisma.budgetPlan.findFirst({ where: { id: resolvedPlanId, organizationId: orgId } })
  if (plan?.status === "approved") {
    return NextResponse.json({ error: "План утверждён — изменения запрещены" }, { status: 403 })
  }

  if (Number(resolvedAmount) < 0) {
    return NextResponse.json({ error: "Сумма не может быть отрицательной" }, { status: 400 })
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

  logBudgetChange({ orgId, planId: resolvedPlanId, entityType: "actual", entityId: actual.id, action: "create", snapshot: actual })

  return NextResponse.json({ success: true, data: actual }, { status: 201 })
}
