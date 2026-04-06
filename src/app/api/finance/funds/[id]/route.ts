import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const updateFundSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  targetAmount: z.union([z.string(), z.number().min(0).max(999999999)]).optional().nullable(),
  currency: z.string().max(10).optional(),
  color: z.string().max(20).optional().nullable(),
  isActive: z.boolean().optional(),
})

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

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let data
  try {
    data = updateFundSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { name, description, targetAmount, currency, color, isActive } = data

  // Verify fund belongs to this org before updating (prevent IDOR)
  const existing = await prisma.fund.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const fund = await prisma.fund.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(targetAmount !== undefined && { targetAmount: targetAmount ? parseFloat(String(targetAmount)) : null }),
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

  // Verify fund belongs to this org before deleting (prevent IDOR)
  const existing = await prisma.fund.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.fund.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
