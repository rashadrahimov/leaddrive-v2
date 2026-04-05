import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { recalculateEngagementScore } from "@/lib/contact-events"

/**
 * Engagement Score Decay Cron
 * Called weekly. Recalculates scores with time-decay for all contacts with score > 0.
 * Uses recalculateEngagementScore() which applies:
 * - Full weight for events 0-30 days old
 * - 50% weight for events 30-60 days old
 * - 25% weight for events 60-90 days old
 * - Events older than 90 days are ignored
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "")
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find all contacts with engagement score > 0
    const contacts = await prisma.contact.findMany({
      where: { engagementScore: { gt: 0 } },
      select: { id: true, engagementScore: true },
    })

    let recalculated = 0
    let decayed = 0

    for (const contact of contacts) {
      const newScore = await recalculateEngagementScore(contact.id)
      recalculated++
      if (newScore < contact.engagementScore) decayed++
    }

    return NextResponse.json({
      success: true,
      data: { recalculated, decayed, total: contacts.length },
    })
  } catch (error) {
    console.error("[Cron] Engagement decay error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
