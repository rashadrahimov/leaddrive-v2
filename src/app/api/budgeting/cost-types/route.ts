import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true"

  const costTypes = await prisma.budgetCostType.findMany({
    where: { organizationId: orgId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ success: true, data: costTypes })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { key, label, costModelPattern, isShared, allocationMethod, color, sortOrder } = body

  if (!key || !label) {
    return NextResponse.json({ error: "key and label are required" }, { status: 400 })
  }

  const existing = await prisma.budgetCostType.findUnique({
    where: { organizationId_key: { organizationId: orgId, key } },
  })
  if (existing) {
    return NextResponse.json({ error: `Cost type with key "${key}" already exists` }, { status: 409 })
  }

  const costType = await prisma.budgetCostType.create({
    data: {
      organizationId: orgId,
      key,
      label,
      costModelPattern: costModelPattern || null,
      isShared: isShared ?? false,
      allocationMethod: allocationMethod || null,
      color: color || null,
      sortOrder: sortOrder ?? 0,
    },
  })

  return NextResponse.json({ success: true, data: costType }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  const costType = await prisma.budgetCostType.update({
    where: { id, organizationId: orgId },
    data: updates,
  })

  return NextResponse.json({ success: true, data: costType })
}

export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  // Soft-delete: deactivate instead of removing (preserves FK references)
  const costType = await prisma.budgetCostType.update({
    where: { id, organizationId: orgId },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true, data: costType })
}
