import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "monthly" // weekly, monthly, yearly

  try {
    const now = new Date()
    let startDate: Date

    if (period === "weekly") {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else if (period === "yearly") {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const where = { organizationId: orgId, createdAt: { gte: startDate } }

    const [totalVisits, totalTasks, completedTasks, totalPhotos, visits, tasks] = await Promise.all([
      prisma.mtmVisit.count({ where }),
      prisma.mtmTask.count({ where }),
      prisma.mtmTask.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.mtmPhoto.count({ where }),
      prisma.mtmVisit.findMany({
        where,
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.mtmTask.findMany({
        where,
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "asc" },
      }),
    ])

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Group by month for yearly trend
    const monthlyTrend: Record<string, { visits: number; tasks: number }> = {}
    for (const v of visits) {
      const key = `${v.createdAt.getFullYear()}-${String(v.createdAt.getMonth() + 1).padStart(2, "0")}`
      if (!monthlyTrend[key]) monthlyTrend[key] = { visits: 0, tasks: 0 }
      monthlyTrend[key].visits++
    }
    for (const t of tasks) {
      const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, "0")}`
      if (!monthlyTrend[key]) monthlyTrend[key] = { visits: 0, tasks: 0 }
      monthlyTrend[key].tasks++
    }

    // Group by day-of-week for weekly comparison
    const weeklyComparison: Record<number, { thisWeek: number; lastWeek: number }> = {}
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(now.getDate() - 7)
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(now.getDate() - 14)

    for (let d = 0; d < 7; d++) weeklyComparison[d] = { thisWeek: 0, lastWeek: 0 }

    const recentVisits = await prisma.mtmVisit.findMany({
      where: { organizationId: orgId, createdAt: { gte: twoWeeksAgo } },
      select: { createdAt: true },
    })

    for (const v of recentVisits) {
      const dow = v.createdAt.getDay()
      if (v.createdAt >= oneWeekAgo) weeklyComparison[dow].thisWeek++
      else weeklyComparison[dow].lastWeek++
    }

    // Top agents
    const agentStats = await prisma.mtmVisit.groupBy({
      by: ["agentId"],
      where: { organizationId: orgId, createdAt: { gte: startDate } },
      _count: true,
      orderBy: { _count: { agentId: "desc" } },
      take: 5,
    })

    const agentIds = agentStats.map((a) => a.agentId)
    const agents = await prisma.mtmAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    })
    const agentMap = Object.fromEntries(agents.map((a) => [a.id, a.name]))

    const topAgents = agentStats.map((a) => ({
      agentId: a.agentId,
      name: agentMap[a.agentId] || "Unknown",
      visits: a._count,
    }))

    return NextResponse.json({
      success: true,
      data: {
        kpi: { totalVisits, totalTasks, totalPhotos, completionRate },
        monthlyTrend: Object.entries(monthlyTrend).map(([month, data]) => ({ month, ...data })),
        weeklyComparison: Object.entries(weeklyComparison).map(([day, data]) => ({ day: Number(day), ...data })),
        topAgents,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch analytics" }, { status: 500 })
  }
}
