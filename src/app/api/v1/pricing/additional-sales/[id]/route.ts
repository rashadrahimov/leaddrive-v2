import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const sale = await prisma.additionalSale.findFirst({
    where: { id, organizationId: orgId },
    include: {
      profile: {
        select: { id: true, companyCode: true, company: { select: { id: true, name: true } } },
      },
    },
  })

  if (!sale) return NextResponse.json({ error: "Additional sale not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: sale })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.additionalSale.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Additional sale not found" }, { status: 404 })

  try {
    const body = await req.json()
    const { name, description, categoryName, unit, qty, price, type, effectiveDate, endDate, status } = body

    const newQty = qty !== undefined ? qty : existing.qty
    const newPrice = price !== undefined ? price : existing.price
    const total = newQty * newPrice

    const sale = await prisma.additionalSale.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(categoryName !== undefined && { categoryName }),
        ...(unit !== undefined && { unit }),
        ...(qty !== undefined && { qty }),
        ...(price !== undefined && { price }),
        total,
        ...(type !== undefined && { type }),
        ...(effectiveDate !== undefined && { effectiveDate: new Date(effectiveDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status !== undefined && { status }),
      },
      include: {
        profile: {
          select: { id: true, companyCode: true, company: { select: { id: true, name: true } } },
        },
      },
    })

    return NextResponse.json({ success: true, data: sale })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update additional sale" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.additionalSale.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Additional sale not found" }, { status: 404 })

  await prisma.additionalSale.delete({ where: { id } })
  return NextResponse.json({ success: true, data: { deleted: true } })
}
