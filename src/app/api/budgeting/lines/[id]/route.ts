import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma, logBudgetChange } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { category, department, lineType, lineSubtype, plannedAmount, forecastAmount, unitPrice, unitCost, quantity, costModelKey, isAutoActual, notes, parentId } = body

  // Fetch old state for change log
  const line = await prisma.budgetLine.findFirst({ where: { id, organizationId: orgId } })
  if (line) {
    const plan = await prisma.budgetPlan.findFirst({ where: { id: line.planId }, select: { status: true } })
    if (plan?.status === "approved") {
      return NextResponse.json({ error: "План утверждён — изменения запрещены" }, { status: 403 })
    }
  }

  if (plannedAmount !== undefined && Number(plannedAmount) < 0) {
    return NextResponse.json({ error: "Сумма не может быть отрицательной" }, { status: 400 })
  }
  if (forecastAmount !== undefined && forecastAmount != null && Number(forecastAmount) < 0) {
    return NextResponse.json({ error: "Прогнозная сумма не может быть отрицательной" }, { status: 400 })
  }

  const result = await prisma.budgetLine.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...(category !== undefined && { category }),
      ...(department !== undefined && { department }),
      ...(lineType !== undefined && { lineType }),
      ...(lineSubtype !== undefined && { lineSubtype: lineSubtype || null }),
      ...(plannedAmount !== undefined && { plannedAmount: Number(plannedAmount) }),
      ...(forecastAmount !== undefined && { forecastAmount: forecastAmount != null ? Number(forecastAmount) : null }),
      ...(unitPrice !== undefined && { unitPrice: unitPrice != null ? Number(unitPrice) : null }),
      ...(unitCost !== undefined && { unitCost: unitCost != null ? Number(unitCost) : null }),
      ...(quantity !== undefined && { quantity: quantity != null ? Number(quantity) : null }),
      ...(costModelKey !== undefined && { costModelKey: costModelKey || null }),
      ...(isAutoActual !== undefined && { isAutoActual: Boolean(isAutoActual) }),
      ...(notes !== undefined && { notes }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  })

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.budgetLine.findFirst({ where: { id, organizationId: orgId } })

  if (updated && line) {
    // Log each changed field
    const fields = ["category", "department", "lineType", "lineSubtype", "plannedAmount", "forecastAmount", "unitPrice", "unitCost", "quantity", "costModelKey", "isAutoActual", "notes", "parentId"] as const
    for (const f of fields) {
      const oldVal = (line as any)[f]
      const newVal = (updated as any)[f]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        logBudgetChange({ orgId, planId: line.planId, entityType: "line", entityId: id, action: "update", field: f, oldValue: oldVal, newValue: newVal, snapshot: updated })
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
  const lineToDelete = await prisma.budgetLine.findFirst({ where: { id, organizationId: orgId } })
  if (lineToDelete) {
    const plan = await prisma.budgetPlan.findFirst({ where: { id: lineToDelete.planId }, select: { status: true } })
    if (plan?.status === "approved") {
      return NextResponse.json({ error: "План утверждён — изменения запрещены" }, { status: 403 })
    }
  }

  await prisma.budgetLine.deleteMany({ where: { id, organizationId: orgId } })

  if (lineToDelete) {
    logBudgetChange({ orgId, planId: lineToDelete.planId, entityType: "line", entityId: id, action: "delete", oldValue: lineToDelete })
  }

  return NextResponse.json({ success: true, data: null })
}
