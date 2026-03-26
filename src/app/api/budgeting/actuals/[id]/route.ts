import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma, logBudgetChange } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { actualAmount, category, department, lineType, expenseDate, description } = body

  const oldActual = await prisma.budgetActual.findFirst({ where: { id, organizationId: orgId } })

  const result = await prisma.budgetActual.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...(actualAmount !== undefined && { actualAmount: Number(actualAmount) }),
      ...(category !== undefined && { category }),
      ...(department !== undefined && { department }),
      ...(lineType !== undefined && { lineType }),
      ...(expenseDate !== undefined && { expenseDate }),
      ...(description !== undefined && { description }),
    },
  })

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.budgetActual.findFirst({ where: { id, organizationId: orgId } })

  if (updated && oldActual) {
    const fields = ["actualAmount", "category", "department", "lineType", "expenseDate", "description"] as const
    for (const f of fields) {
      const oldVal = (oldActual as any)[f]
      const newVal = (updated as any)[f]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        logBudgetChange({ orgId, planId: oldActual.planId, entityType: "actual", entityId: id, action: "update", field: f, oldValue: oldVal, newValue: newVal, snapshot: updated })
      }
    }
  }

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Fetch full state before deletion for change log
  const actualToDelete = await prisma.budgetActual.findFirst({ where: { id, organizationId: orgId } })
  if (actualToDelete) {
    const plan = await prisma.budgetPlan.findFirst({ where: { id: actualToDelete.planId }, select: { status: true } })
    if (plan?.status === "approved") {
      return NextResponse.json({ error: "План утверждён — изменения запрещены" }, { status: 403 })
    }
  }

  await prisma.budgetActual.deleteMany({ where: { id, organizationId: orgId } })

  if (actualToDelete) {
    logBudgetChange({ orgId, planId: actualToDelete.planId, entityType: "actual", entityId: id, action: "delete", oldValue: actualToDelete })
  }

  return NextResponse.json({ success: true, data: null })
}
