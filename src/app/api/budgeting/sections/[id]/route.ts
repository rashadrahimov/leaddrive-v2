import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, sectionType, sortOrder } = body

  const result = await prisma.budgetSection.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...(name !== undefined && { name }),
      ...(sectionType !== undefined && { sectionType }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  })

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.budgetSection.findFirst({ where: { id, organizationId: orgId } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await prisma.budgetSection.deleteMany({ where: { id, organizationId: orgId } })
  return NextResponse.json({ success: true, data: null })
}
