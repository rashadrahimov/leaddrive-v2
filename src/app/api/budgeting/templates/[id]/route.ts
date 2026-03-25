import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { name, description, lineType, lineSubtype, defaultAmount, unitPrice, unitCost, quantity, costModelKey, department, isActive } = body

  const template = await prisma.budgetDirectionTemplate.update({
    where: { id, organizationId: orgId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(lineType !== undefined && { lineType }),
      ...(lineSubtype !== undefined && { lineSubtype: lineSubtype || null }),
      ...(defaultAmount !== undefined && { defaultAmount: Number(defaultAmount) }),
      ...(unitPrice !== undefined && { unitPrice: unitPrice != null ? Number(unitPrice) : null }),
      ...(unitCost !== undefined && { unitCost: unitCost != null ? Number(unitCost) : null }),
      ...(quantity !== undefined && { quantity: quantity != null ? Number(quantity) : null }),
      ...(costModelKey !== undefined && { costModelKey: costModelKey || null }),
      ...(department !== undefined && { department: department || null }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ data: template })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  await prisma.budgetDirectionTemplate.delete({
    where: { id, organizationId: orgId },
  })

  return NextResponse.json({ data: null })
}
