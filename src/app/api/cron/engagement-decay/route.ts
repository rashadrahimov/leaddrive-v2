import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Engagement Score Decay Cron
 * Called weekly. Decays scores for contacts inactive for 7+ days.
 * - Inactive 7+ days: -10% per run
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "")
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

    // Find contacts with score > 0 and no activity in last 7 days
    const staleContacts = await prisma.contact.findMany({
      where: {
        engagementScore: { gt: 0 },
        OR: [
          { lastActivityAt: null },
          { lastActivityAt: { lt: sevenDaysAgo } },
        ],
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
      data: { decayed: decayedCount, checked: staleContacts.length },
    })
  } catch (error) {
    console.error("[Cron] Engagement decay error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
