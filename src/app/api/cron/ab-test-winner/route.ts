import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

/**
 * A/B Test Winner Selection Cron
 * Called every 15 minutes by external cron
 * Selects winners for A/B test campaigns where test duration has elapsed
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "")
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Find campaigns in ab_testing status where test duration has elapsed
    const campaigns = await prisma.campaign.findMany({
      where: {
        isAbTest: true,
        status: "ab_testing",
        winnerSelectedAt: null,
        sentAt: { not: null },
      },
      include: { variants: true },
    })

    let processed = 0

    for (const campaign of campaigns) {
      if (!campaign.sentAt || campaign.variants.length < 2) continue

      // Check if test duration has elapsed
      const durationMs = (campaign.testDurationHours ?? 4) * 3600 * 1000
      const elapsed = Date.now() - campaign.sentAt.getTime()
      if (elapsed < durationMs) continue

      // Select winner based on criteria
      const criteria = campaign.winnerCriteria ?? "open_rate"

      const variantStats = campaign.variants.map(v => ({
        ...v,
        openRate: v.totalSent > 0 ? v.totalOpened / v.totalSent : 0,
        clickRate: v.totalSent > 0 ? v.totalClicked / v.totalSent : 0,
      }))

      const sorted = variantStats.sort((a, b) =>
        criteria === "click_rate"
          ? b.clickRate - a.clickRate
          : b.openRate - a.openRate
      )

      const winner = sorted[0]

      // Mark winner
      await prisma.campaignVariant.update({
        where: { id: winner.id },
        data: { isWinner: true },
      })

      // Update campaign
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          winnerSelectedAt: new Date(),
          status: "sent",
        },
      })

      // Notify campaign creator
      if (campaign.createdBy) {
        await createNotification({
          organizationId: campaign.organizationId,
          userId: campaign.createdBy,
          type: "success",
          title: "A/B Test Winner Selected",
          message: `Campaign "${campaign.name}": ${winner.name} won with ${criteria === "click_rate" ? `${(winner.clickRate * 100).toFixed(1)}% CTR` : `${(winner.openRate * 100).toFixed(1)}% open rate`}`,
          entityType: "campaign",
          entityId: campaign.id,
        }).catch(() => {})
      }

      processed++
    }

    return NextResponse.json({ success: true, processed })
  } catch (error) {
    console.error("[Cron] A/B test winner selection error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
