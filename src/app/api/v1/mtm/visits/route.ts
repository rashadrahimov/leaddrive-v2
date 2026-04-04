import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""
  const customerId = searchParams.get("customerId") || ""
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (agentId) where.agentId = agentId
    if (customerId) where.customerId = customerId
    if (from || to) {
      where.checkInAt = {}
      if (from) where.checkInAt.gte = new Date(from)
      if (to) where.checkInAt.lte = new Date(to)
    }

    const [visits, total] = await Promise.all([
      prisma.mtmVisit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { checkInAt: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, address: true } },
        },
      }),
      prisma.mtmVisit.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { visits, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { visits: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const visit = await prisma.mtmVisit.create({
      data: {
        organizationId: orgId,
        agentId: body.agentId,
        customerId: body.customerId,
        checkInLat: body.latitude ? parseFloat(body.latitude) : null,
        checkInLng: body.longitude ? parseFloat(body.longitude) : null,
        notes: body.notes || null,
      },
    })
    return NextResponse.json({ success: true, data: visit }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create visit" }, { status: 400 })
  }
}
