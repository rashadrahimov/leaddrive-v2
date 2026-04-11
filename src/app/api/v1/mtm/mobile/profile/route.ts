import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMobileAuth } from "@/lib/mobile-auth"

/**
 * GET /api/v1/mtm/mobile/profile
 * Get agent profile + today's summary.
 */
export async function GET(req: NextRequest) {
  const auth = requireMobileAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const agent = await prisma.mtmAgent.findUnique({
      where: { id: auth.agentId },
      include: {
        organization: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [todayVisits, todayTasks, todayRoute] = await Promise.all([
      prisma.mtmVisit.count({
        where: { agentId: auth.agentId, checkInAt: { gte: today, lt: tomorrow } },
      }),
      prisma.mtmTask.count({
        where: { agentId: auth.agentId, status: "COMPLETED", completedAt: { gte: today, lt: tomorrow } },
      }),
      prisma.mtmRoute.findFirst({
        where: { agentId: auth.agentId, date: { gte: today, lt: tomorrow } },
        select: { id: true, totalPoints: true, visitedPoints: true, status: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          role: agent.role,
          status: agent.status,
          avatar: agent.avatar,
          isOnline: agent.isOnline,
          organizationId: agent.organizationId,
          organizationName: agent.organization.name,
          manager: agent.manager,
        },
        todaySummary: {
          visits: todayVisits,
          tasksCompleted: todayTasks,
          routePoints: todayRoute?.totalPoints || 0,
          routeVisited: todayRoute?.visitedPoints || 0,
          routeStatus: todayRoute?.status || "NONE",
        },
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load profile" }, { status: 500 })
  }
}
