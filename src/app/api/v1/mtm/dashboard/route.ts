import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "today"

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    let periodStart: Date
    if (period === "week") {
      periodStart = new Date(now)
      periodStart.setDate(now.getDate() - 7)
    } else if (period === "month") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      periodStart = today
    }

    const periodWhere = { organizationId: orgId, createdAt: { gte: periodStart } }

    const [
      totalAgents,
      activeAgents,
      todayRoutes,
      completedRoutes,
      offRouteAlerts,
      todayVisits,
      totalCustomers,
      pendingTasks,
      urgentTasks,
      unresolvedAlerts,
      recentVisits,
      onlineAgents,
      completedTasks,
      totalTasks,
      avgVisitDuration,
    ] = await Promise.all([
      prisma.mtmAgent.count({ where: { organizationId: orgId } }),
      prisma.mtmAgent.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.mtmRoute.count({ where: { organizationId: orgId, date: { gte: periodStart } } }),
      prisma.mtmRoute.count({ where: { organizationId: orgId, date: { gte: periodStart }, status: "COMPLETED" } }),
      prisma.mtmAlert.count({ where: { organizationId: orgId, category: "WARNING", isResolved: false } }),
      prisma.mtmVisit.count({ where: { organizationId: orgId, checkInAt: { gte: periodStart } } }),
      prisma.mtmCustomer.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.mtmTask.count({ where: { organizationId: orgId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
      prisma.mtmTask.count({ where: { organizationId: orgId, priority: "URGENT", status: { in: ["PENDING", "IN_PROGRESS"] } } }),
      prisma.mtmAlert.count({ where: { organizationId: orgId, isResolved: false } }),
      prisma.mtmVisit.findMany({
        where: { organizationId: orgId },
        take: 10,
        orderBy: { checkInAt: "desc" },
        include: { agent: { select: { name: true } }, customer: { select: { name: true } } },
      }),
      prisma.mtmAgent.findMany({
        where: { organizationId: orgId, isOnline: true },
        select: { id: true, name: true },
      }),
      prisma.mtmTask.count({ where: { ...periodWhere, status: "COMPLETED" } }),
      prisma.mtmTask.count({ where: periodWhere }),
      prisma.mtmVisit.aggregate({
        where: { organizationId: orgId, checkInAt: { gte: periodStart }, duration: { not: null } },
        _avg: { duration: true },
      }),
    ])

    const routeCompletion = todayRoutes > 0 ? Math.round((completedRoutes / todayRoutes) * 100) : 0

    const agentLocations = await prisma.mtmAgentLocation.findMany({
      where: { organizationId: orgId, agentId: { in: onlineAgents.map(a => a.id) } },
      orderBy: { recordedAt: "desc" },
      distinct: ["agentId"],
      select: { agentId: true, speed: true, recordedAt: true },
    })
    const agentLocationMap = Object.fromEntries(agentLocations.map(l => [l.agentId, l]))

    const activeAgentsList = onlineAgents.map(a => ({
      id: a.id,
      name: a.name,
      speed: agentLocationMap[a.id]?.speed ?? null,
      lastSeen: agentLocationMap[a.id]?.recordedAt ?? null,
    }))

    const avgRouteDuration = await prisma.mtmVisit.aggregate({
      where: { organizationId: orgId, checkInAt: { gte: periodStart }, status: "CHECKED_OUT", duration: { not: null } },
      _avg: { duration: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        totalAgents,
        activeAgents,
        onlineAgents: onlineAgents.length,
        todayRoutes,
        completedRoutes,
        routeCompletion,
        offRouteAlerts,
        todayVisits,
        totalCustomers,
        pendingTasks,
        urgentTasks,
        unresolvedAlerts,
        avgVisitDuration: Math.round(avgVisitDuration._avg?.duration ?? 0),
        avgRouteDuration: Math.round(avgRouteDuration._avg?.duration ?? 0),
        totalWorkTime: Math.round((avgRouteDuration._avg?.duration ?? 0) * todayVisits / 60),
        activeAgentsList,
        recentVisits: recentVisits.map((v: any) => ({
          id: v.id,
          agent: v.agent.name,
          customer: v.customer.name,
          status: v.status,
          checkInAt: v.checkInAt,
          checkOutAt: v.checkOutAt,
          duration: v.duration,
        })),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
