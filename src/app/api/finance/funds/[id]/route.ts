import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const fund = await prisma.fund.findFirst({
    where: { id, organizationId: orgId },
    include: { rules: true },
  })
  if (!fund) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ data: fund })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { name, description, targetAmount, currency, color, isActive } = body

  const fund = await prisma.fund.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(targetAmount !== undefined && { targetAmount: targetAmount ? parseFloat(targetAmount) : null }),
      ...(currency !== undefined && { currency }),
      ...(color !== undefined && { color }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ data: fund })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  await prisma.fund.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
