import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      totalAgents,
      activeAgents,
      todayRoutes,
      completedRoutes,
      todayVisits,
      totalCustomers,
      pendingTasks,
      unresolvedAlerts,
      recentVisits,
    ] = await Promise.all([
      prisma.mtmAgent.count({ where: { organizationId: orgId } }),
      prisma.mtmAgent.count({ where: { organizationId: orgId, isOnline: true } }),
      prisma.mtmRoute.count({ where: { organizationId: orgId, date: { gte: today, lt: tomorrow } } }),
      prisma.mtmRoute.count({ where: { organizationId: orgId, date: { gte: today, lt: tomorrow }, status: "COMPLETED" } }),
      prisma.mtmVisit.count({ where: { organizationId: orgId, checkInAt: { gte: today } } }),
      prisma.mtmCustomer.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
      prisma.mtmTask.count({ where: { organizationId: orgId, status: { in: ["PENDING", "IN_PROGRESS"] } } }),
      prisma.mtmAlert.count({ where: { organizationId: orgId, isResolved: false } }),
      prisma.mtmVisit.findMany({
        where: { organizationId: orgId },
        take: 10,
        orderBy: { checkInAt: "desc" },
        include: { agent: { select: { name: true } }, customer: { select: { name: true } } },
      }),
    ])

    const routeCompletion = todayRoutes > 0 ? Math.round((completedRoutes / todayRoutes) * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        totalAgents,
        activeAgents,
        todayRoutes,
        completedRoutes,
        routeCompletion,
        todayVisits,
        totalCustomers,
        pendingTasks,
        unresolvedAlerts,
        recentVisits: recentVisits.map((v) => ({
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
