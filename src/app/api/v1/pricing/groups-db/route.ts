import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const groups = await prisma.pricingGroup.findMany({
    where: { organizationId: orgId },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { profiles: true } },
    },
  })

  return NextResponse.json({ success: true, data: groups })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name } = body

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const maxOrder = await prisma.pricingGroup.aggregate({
      where: { organizationId: orgId },
      _max: { sortOrder: true },
    })

    const group = await prisma.pricingGroup.create({
      data: {
        organizationId: orgId,
        name,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json({ success: true, data: group }, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Group with this name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || "Failed to create group" }, { status: 500 })
  }
}
