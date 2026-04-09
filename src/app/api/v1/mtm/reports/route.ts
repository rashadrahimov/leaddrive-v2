import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "" // daily, agent, route, visit, gps, photo
  const period = searchParams.get("period") || "week" // today, week, month

  try {
    const now = new Date()
    let startDate: Date

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    }

    const where = { organizationId: orgId, createdAt: { gte: startDate } }

    // Report type counts for cards
    const [dailyCount, agentCount, routeCount, visitCount, gpsCount, photoCount] = await Promise.all([
      prisma.mtmAuditLog.count({ where }),
      prisma.mtmAgent.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.mtmRoute.count({ where }),
      prisma.mtmVisit.count({ where }),
      prisma.mtmAgentLocation.count({ where }),
      prisma.mtmPhoto.count({ where }),
    ])

    // If a specific report type is requested, return detailed data
    let reportData = null

    if (type === "daily") {
      reportData = await prisma.mtmAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { agent: { select: { name: true } } },
      })
    } else if (type === "agent") {
      const agents = await prisma.mtmAgent.findMany({
        where: { organizationId: orgId, status: "ACTIVE" },
        select: { id: true, name: true, role: true },
      })
      const stats = await Promise.all(
        agents.map(async (agent) => {
          const [visits, tasks, photos] = await Promise.all([
            prisma.mtmVisit.count({ where: { ...where, agentId: agent.id } }),
            prisma.mtmTask.count({ where: { ...where, agentId: agent.id, status: "COMPLETED" } }),
            prisma.mtmPhoto.count({ where: { ...where, agentId: agent.id, status: "APPROVED" } }),
          ])
          return { ...agent, visits, tasks, photos }
        })
      )
      reportData = stats
    } else if (type === "route") {
      reportData = await prisma.mtmRoute.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          agent: { select: { name: true } },
          _count: { select: { points: true } },
        },
      })
    } else if (type === "visit") {
      reportData = await prisma.mtmVisit.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          agent: { select: { name: true } },
          customer: { select: { name: true } },
        },
      })
    } else if (type === "photo") {
      reportData = await prisma.mtmPhoto.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          agent: { select: { name: true } },
          visit: { select: { customer: { select: { name: true } } } },
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        counts: { daily: dailyCount, agent: agentCount, route: routeCount, visit: visitCount, gps: gpsCount, photo: photoCount },
        reportData,
        period,
        type,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch reports" }, { status: 500 })
  }
}
