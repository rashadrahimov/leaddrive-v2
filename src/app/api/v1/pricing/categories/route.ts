import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await prisma.pricingCategory.findMany({
    where: { organizationId: orgId },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ success: true, data: categories })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, boardCategory } = body

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const maxOrder = await prisma.pricingCategory.aggregate({
      where: { organizationId: orgId },
      _max: { sortOrder: true },
    })

    const category = await prisma.pricingCategory.create({
      data: {
        organizationId: orgId,
        name,
        boardCategory: boardCategory || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    })

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || "Failed to create category" }, { status: 500 })
  }
}
