import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: orgId as string },
    include: {
      stages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { deals: true } },
    },
  })

  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: pipeline })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: orgId as string },
  })
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()

  // If setting as default, unset others
  if (body.isDefault) {
    await prisma.pipeline.updateMany({
      where: { organizationId: orgId as string, isDefault: true },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.pipeline.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      isDefault: body.isDefault ?? undefined,
      isActive: body.isActive ?? undefined,
      sortOrder: body.sortOrder ?? undefined,
    },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
      _count: { select: { deals: true } },
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: orgId as string },
    include: { _count: { select: { deals: true } } },
  })
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (pipeline._count.deals > 0) {
    return NextResponse.json(
      { error: `Cannot delete pipeline with ${pipeline._count.deals} deals. Move or delete deals first.` },
      { status: 400 }
    )
  }

  if (pipeline.isDefault) {
    return NextResponse.json({ error: "Cannot delete the default pipeline" }, { status: 400 })
  }

  await prisma.pipeline.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
