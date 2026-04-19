import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { pollFacebookAccount, pollInstagramAccount } from "@/lib/social/facebook-poller"
import { pollTwitterAccount } from "@/lib/social/twitter-poller"
import { pollVkAccount } from "@/lib/social/vk-poller"
import { pollYouTubeAccount } from "@/lib/social/youtube-poller"
import { pollTikTokAccount } from "@/lib/social/tiktok-poller"
import { scanTelegramForOrg } from "@/lib/social/telegram-scanner"
import { sendPushToUser } from "@/lib/push-send"

/**
 * Cron job: poll every active social account, then check each org for a
 * negative-mention spike — today's count >= 3 AND > 2× the trailing 7-day
 * average. On spike, fire a web-push to every admin/manager in the org.
 *
 * Auth: Bearer CRON_SECRET. Designed to be called by instrumentation.ts every
 * 15 min, but also safe to call manually for testing.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || ""
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { isActive: true },
  })

  const polled: Array<{ id: string; platform: string; ingested: number; error?: string }> = []
  const orgsTouched = new Set<string>()

  for (const acc of accounts) {
    let result: { ingested: number; error?: string } = { ingested: 0 }
    try {
      switch (acc.platform) {
        case "facebook":
          if (!acc.accessToken) { result = { ingested: 0, error: "no_token" }; break }
          result = await pollFacebookAccount(acc.id); break
        case "instagram":
          if (!acc.accessToken) { result = { ingested: 0, error: "no_token" }; break }
          result = await pollInstagramAccount(acc.id); break
        case "twitter":
          if (!acc.accessToken) { result = { ingested: 0, error: "no_token" }; break }
          result = await pollTwitterAccount(acc.id); break
        case "vkontakte":
          result = await pollVkAccount(acc.id); break
        case "youtube":
          result = await pollYouTubeAccount(acc.id); break
        case "tiktok":
          result = await pollTikTokAccount(acc.id); break
        case "telegram":
          result = await scanTelegramForOrg(acc.organizationId); break
      }
    } catch (e: any) {
      result = { ingested: 0, error: e?.message || "exception" }
    }
    polled.push({ id: acc.id, platform: acc.platform, ...result })
    if (result.ingested > 0) orgsTouched.add(acc.organizationId)
  }

  // Spike detection per org. Fires once per org per cron tick — push handlers
  // dedupe by tag (`ld-social-spike-<orgId>`) so consecutive ticks don't spam.
  const spikes: Array<{ orgId: string; today: number; avg7d: number; alerted: number }> = []
  for (const orgId of orgsTouched) {
    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setUTCHours(0, 0, 0, 0)
    const startOf7dAgo = new Date(startOfToday.getTime() - 7 * 86400_000)

    const [today, last7d] = await Promise.all([
      prisma.socialMention.count({
        where: { organizationId: orgId, sentiment: "negative", createdAt: { gte: startOfToday } },
      }),
      prisma.socialMention.count({
        where: { organizationId: orgId, sentiment: "negative", createdAt: { gte: startOf7dAgo, lt: startOfToday } },
      }),
    ])
    const avg7d = last7d / 7
    if (today < 3 || today <= avg7d * 2) continue

    const recipients = await prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ["admin", "manager", "support", "superadmin"] } },
      select: { id: true },
    })
    let alerted = 0
    for (const u of recipients) {
      try {
        await sendPushToUser(orgId, u.id, {
          title: "🔴 Negative-mention spike",
          body: `${today} negative mentions today vs 7-day avg ${avg7d.toFixed(1)}. Open the inbox.`,
          url: "/social-monitoring?sentiment=negative",
          tag: `ld-social-spike-${orgId}`,
        })
        alerted++
      } catch (e) {
        console.error("[social-cron] push to user failed:", e)
      }
    }
    spikes.push({ orgId, today, avg7d: Number(avg7d.toFixed(1)), alerted })
  }

  return NextResponse.json({
    success: true,
    data: {
      pollerCount: accounts.length,
      ingestedTotal: polled.reduce((a, b) => a + b.ingested, 0),
      polled,
      spikes,
    },
  })
}
