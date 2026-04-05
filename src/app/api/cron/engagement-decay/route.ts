import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Engagement Score Decay Cron
 * Called daily. Decays scores for inactive contacts.
 * - Inactive 30-90 days: -10% per run
 * - Inactive 90+ days: set to 0
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "")
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)

    // Zero out contacts inactive for 90+ days
    const zeroed = await prisma.contact.updateMany({
      where: {
        engagementScore: { gt: 0 },
        OR: [
          { lastActivityAt: null },
          { lastActivityAt: { lt: ninetyDaysAgo } },
        ],
      },
      data: { engagementScore: 0 },
    })

    // Decay by 10% for contacts inactive 30-90 days
    const staleContacts = await prisma.contact.findMany({
      where: {
        engagementScore: { gt: 0 },
        lastActivityAt: { gte: ninetyDaysAgo, lt: thirtyDaysAgo },
      },
      select: { id: true, engagementScore: true },
    })

    let decayedCount = 0
    for (const contact of staleContacts) {
      const newScore = Math.max(0, Math.floor(contact.engagementScore * 0.9))
      if (newScore !== contact.engagementScore) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { engagementScore: newScore },
        })
        decayedCount++
      }
    }

    return NextResponse.json({
      success: true,
      data: { zeroed: zeroed.count, decayed: decayedCount },
    })
  } catch (error) {
    console.error("[Cron] Engagement decay error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
