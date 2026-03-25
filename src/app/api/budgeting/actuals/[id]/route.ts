import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { actualAmount, category, department, lineType, expenseDate, description } = body

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
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Check plan is not approved
  const actualToDelete = await prisma.budgetActual.findFirst({ where: { id, organizationId: orgId }, select: { planId: true } })
  if (actualToDelete) {
    const plan = await prisma.budgetPlan.findFirst({ where: { id: actualToDelete.planId }, select: { status: true } })
    if (plan?.status === "approved") {
      return NextResponse.json({ error: "План утверждён — изменения запрещены" }, { status: 403 })
    }
  }

  await prisma.budgetActual.deleteMany({ where: { id, organizationId: orgId } })

  return NextResponse.json({ success: true, data: null })
}
