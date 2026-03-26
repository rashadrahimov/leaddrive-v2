import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { resolvePatternForDept } from "@/lib/budgeting/cost-model-map"

/**
 * POST /api/budgeting/matrix-seed
 *
 * Auto-generate BudgetLines for a plan using the matrix template:
 * costTypes × departments (Cartesian product).
 *
 * Body: { planId: string, includeRevenue?: boolean }
 *
 * For each non-shared costType → creates a line per active department.
 * For each shared costType → creates one line (no department).
 * If includeRevenue → creates revenue lines per department with hasRevenue=true.
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { planId, includeRevenue = true } = body

  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const plan = await prisma.budgetPlan.findFirst({ where: { id: planId, organizationId: orgId } })
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  const [costTypes, departments] = await Promise.all([
    prisma.budgetCostType.findMany({ where: { organizationId: orgId, isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.budgetDepartment.findMany({ where: { organizationId: orgId, isActive: true }, orderBy: { sortOrder: "asc" } }),
  ])

  if (costTypes.length === 0) {
    return NextResponse.json({ error: "No cost types configured. Run seed or add via Settings." }, { status: 400 })
  }

  const linesToCreate: any[] = []
  let sortOrder = 0

  // Expense lines: costType × department matrix
  for (const ct of costTypes) {
    if (ct.isShared) {
      // Shared cost type → one line without department
      const costModelKey = ct.costModelPattern?.includes("{dept}")
        ? null // pattern needs dept but type is shared — skip auto-actual
        : ct.costModelPattern || null
      sortOrder++
      linesToCreate.push({
        organizationId: orgId,
        planId,
        category: ct.label,
        lineType: "expense",
        plannedAmount: 0,
        costModelKey,
        isAutoActual: !!costModelKey,
        costTypeId: ct.id,
        departmentId: null,
        department: null,
        sortOrder,
      })
    } else {
      // Non-shared → one line per department
      for (const dept of departments) {
        if (!dept.serviceKey) continue // skip departments with no service mapping (e.g. BackOffice for non-shared types)
        const costModelKey = ct.costModelPattern
          ? resolvePatternForDept(ct.costModelPattern, dept.serviceKey)
          : null
        sortOrder++
        linesToCreate.push({
          organizationId: orgId,
          planId,
          category: `${ct.label} — ${dept.label}`,
          lineType: "expense",
          plannedAmount: 0,
          costModelKey,
          isAutoActual: !!costModelKey,
          costTypeId: ct.id,
          departmentId: dept.id,
          department: dept.label,
          sortOrder,
        })
      }
    }
  }

  // Revenue lines: one per department with hasRevenue=true
  if (includeRevenue) {
    for (const dept of departments) {
      if (!dept.hasRevenue || !dept.serviceKey) continue
      sortOrder++
      linesToCreate.push({
        organizationId: orgId,
        planId,
        category: `Выручка — ${dept.label}`,
        lineType: "revenue",
        plannedAmount: 0,
        costModelKey: `serviceRevenues.${dept.serviceKey}`,
        isAutoActual: true,
        costTypeId: null,
        departmentId: dept.id,
        department: dept.label,
        sortOrder,
      })
    }
  }

  // Create all lines in a transaction
  const created = await prisma.$transaction(
    linesToCreate.map((data) => prisma.budgetLine.create({ data }))
  )

  return NextResponse.json({
    success: true,
    data: { count: created.length, lines: created },
  }, { status: 201 })
}
