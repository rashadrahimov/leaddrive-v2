import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get("period") || "monthly" // weekly, monthly, all

  try {
    const now = new Date()
    let startDate: Date | undefined

    if (period === "weekly") {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else if (period === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const dateFilter = startDate ? { createdAt: { gte: startDate } } : {}
    const where = { organizationId: orgId, ...dateFilter }

    const agents = await prisma.mtmAgent.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { id: true, name: true },
    })

    const rankings = await Promise.all(
      agents.map(async (agent) => {
        const agentWhere = { ...where, agentId: agent.id }

        const [visits, completedTasks, totalTasks, approvedPhotos, totalPhotos, onTimeRoutes, totalRoutes] =
          await Promise.all([
            prisma.mtmVisit.count({ where: agentWhere }),
            prisma.mtmTask.count({ where: { ...agentWhere, status: "COMPLETED" } }),
            prisma.mtmTask.count({ where: agentWhere }),
            prisma.mtmPhoto.count({ where: { ...agentWhere, status: "APPROVED" } }),
            prisma.mtmPhoto.count({ where: agentWhere }),
            prisma.mtmRoute.count({ where: { ...agentWhere, status: "COMPLETED" } }),
            prisma.mtmRoute.count({ where: agentWhere }),
          ])

        // Scoring: visits * 10 + completedTasks * 15 + approvedPhotos * 5 + onTimeRoutes * 20
        const score = visits * 10 + completedTasks * 15 + approvedPhotos * 5 + onTimeRoutes * 20
        const taskCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        const photoApproval = totalPhotos > 0 ? Math.round((approvedPhotos / totalPhotos) * 100) : 0

        // Achievements
        const achievements = []

        // Speed Master — all routes completed on time
        if (totalRoutes > 0 && onTimeRoutes === totalRoutes) {
          achievements.push({ id: "speed_master", progress: 1, total: 1 })
        } else {
          achievements.push({ id: "speed_master", progress: onTimeRoutes, total: Math.max(totalRoutes, 1) })
        }

        // Photo Champion — 100+ quality photos
        achievements.push({ id: "photo_champion", progress: approvedPhotos, total: 100 })

        // Consistent Success — 10+ consecutive days with reports
        const recentVisitDays = await prisma.mtmVisit.findMany({
          where: agentWhere,
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
        const uniqueDays = new Set(recentVisitDays.map((v) => v.createdAt.toISOString().split("T")[0]))
        achievements.push({ id: "consistent_success", progress: Math.min(uniqueDays.size, 10), total: 10 })

        // Customer Friend — 95%+ satisfaction (using photo approval as proxy)
        achievements.push({ id: "customer_friend", progress: photoApproval >= 95 ? 1 : 0, total: 1 })

        // Perfect Week — 0 delays in a week
        const weekAlerts = startDate
          ? await prisma.mtmAlert.count({
              where: { organizationId: orgId, agentId: agent.id, category: "WARNING", createdAt: { gte: startDate } },
            })
          : 0
        achievements.push({ id: "perfect_week", progress: weekAlerts === 0 ? 1 : 0, total: 1 })

        return {
          agentId: agent.id,
          name: agent.name,
          score,
          visits,
          completedTasks,
          approvedPhotos,
          onTimeRoutes,
          taskCompletion,
          achievements,
        }
      })
    )

    rankings.sort((a, b) => b.score - a.score)

    // Add rank
    const ranked = rankings.map((r, i) => ({ ...r, rank: i + 1 }))

    return NextResponse.json({ success: true, data: { rankings: ranked, period } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch leaderboard" }, { status: 500 })
  }
}
