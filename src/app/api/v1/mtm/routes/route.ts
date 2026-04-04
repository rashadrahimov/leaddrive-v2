import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""
  const date = searchParams.get("date") || ""
  const status = searchParams.get("status") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (agentId) where.agentId = agentId
    if (status) where.status = status
    if (date) {
      const d = new Date(date)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      where.date = { gte: d, lt: next }
    }

    const [routes, total] = await Promise.all([
      prisma.mtmRoute.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          points: { include: { customer: { select: { id: true, name: true, address: true } } }, orderBy: { orderIndex: "asc" } },
        },
      }),
      prisma.mtmRoute.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { routes, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { routes: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const route = await prisma.mtmRoute.create({
      data: {
        organizationId: orgId,
        agentId: body.agentId,
        date: new Date(body.date),
        name: body.name || null,
        notes: body.notes || null,
        totalPoints: body.points?.length || 0,
        points: body.points
          ? {
              create: body.points.map((p: any, i: number) => ({
                customerId: p.customerId,
                orderIndex: i,
                plannedTime: p.plannedTime ? new Date(p.plannedTime) : null,
              })),
            }
          : undefined,
      },
      include: { points: { include: { customer: true } } },
    })
    return NextResponse.json({ success: true, data: route }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create route" }, { status: 400 })
  }
}
