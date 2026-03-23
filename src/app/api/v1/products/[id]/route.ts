import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const product = await prisma.product.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: product })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const product = await prisma.product.updateMany({
    where: { id, organizationId: orgId },
    data: parsed.data,
  })

  if (product.count === 0) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const updated = await prisma.product.findFirst({ where: { id } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const result = await prisma.product.deleteMany({
    where: { id, organizationId: orgId },
  })

  if (result.count === 0) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
