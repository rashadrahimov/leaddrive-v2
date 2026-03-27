import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: fundId } = await params

  const rules = await prisma.fundRule.findMany({
    where: { fundId, organizationId: orgId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ data: rules })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: fundId } = await params

  const body = await req.json()
  const { name, triggerType, percentage, fixedAmount } = body

  if (!name || !triggerType) return NextResponse.json({ error: "name and triggerType required" }, { status: 400 })

  const rule = await prisma.fundRule.create({
    data: {
      organizationId: orgId,
      fundId,
      name,
      triggerType,
      percentage: percentage ? parseFloat(percentage) : null,
      fixedAmount: fixedAmount ? parseFloat(fixedAmount) : null,
    },
  })

  return NextResponse.json({ data: rule }, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, name, triggerType, percentage, fixedAmount, isActive } = body

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const rule = await prisma.fundRule.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(triggerType !== undefined && { triggerType }),
      ...(percentage !== undefined && { percentage: percentage ? parseFloat(percentage) : null }),
      ...(fixedAmount !== undefined && { fixedAmount: fixedAmount ? parseFloat(fixedAmount) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ data: rule })
}

export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await prisma.fundRule.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
