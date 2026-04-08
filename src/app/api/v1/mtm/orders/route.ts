import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""
  const customerId = searchParams.get("customerId") || ""
  const status = searchParams.get("status") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (agentId) where.agentId = agentId
    if (customerId) where.customerId = customerId
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.mtmOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.mtmOrder.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { orders, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { orders: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const items = body.items || []
    const totalAmount = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price || 0) * parseInt(item.qty || 0)), 0)

    // Generate order number
    const count = await prisma.mtmOrder.count({ where: { organizationId: orgId } })
    const orderNumber = `ORD-${String(count + 1).padStart(5, "0")}`

    const order = await prisma.mtmOrder.create({
      data: {
        organizationId: orgId,
        agentId: body.agentId,
        customerId: body.customerId,
        orderNumber,
        status: body.status || "DRAFT",
        items: JSON.stringify(items),
        totalAmount,
        notes: body.notes || null,
      },
    })
    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create order" }, { status: 400 })
  }
}
