import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const profile = await prisma.pricingProfile.findFirst({
    where: { id, organizationId: orgId },
    include: {
      group: true,
      company: { select: { id: true, name: true } },
      categories: {
        include: {
          category: true,
          services: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { category: { sortOrder: "asc" } },
      },
      additionalSales: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: profile })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.pricingProfile.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  try {
    const body = await req.json()
    const { companyCode, companyId, groupId, monthlyTotal, annualTotal, isActive } = body

    const profile = await prisma.pricingProfile.update({
      where: { id },
      data: {
        ...(companyCode !== undefined && { companyCode }),
        ...(companyId !== undefined && { companyId }),
        ...(groupId !== undefined && { groupId }),
        ...(monthlyTotal !== undefined && { monthlyTotal }),
        ...(annualTotal !== undefined && { annualTotal }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { group: true, company: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: profile })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update profile" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const existing = await prisma.pricingProfile.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  await prisma.pricingProfile.delete({ where: { id } })
  return NextResponse.json({ success: true, data: { deleted: true } })
}
