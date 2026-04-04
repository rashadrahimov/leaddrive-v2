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
