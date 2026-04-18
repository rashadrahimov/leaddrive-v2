import { NextRequest, NextResponse } from "next/server"
import { pollAllTwitter } from "@/lib/social/twitter-poller"
import { pollAllTikTok } from "@/lib/social/tiktok-poller"
import { pollAllYouTube } from "@/lib/social/youtube-poller"
import { pollAllVk } from "@/lib/social/vk-poller"
import { scanAllTelegram } from "@/lib/social/telegram-scanner"
import { detectNegativeSpikes } from "@/lib/social/spike-alerts"

/**
 * Cron-triggered social polling runner.
 * Protect with CRON_SECRET env var; callers must send Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization") || ""
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [twitter, tiktok, youtube, vk, telegram] = await Promise.all([
    pollAllTwitter().catch(e => ({ total: 0, perAccount: [], error: e?.message })),
    pollAllTikTok().catch(e => ({ total: 0, accounts: 0, error: e?.message })),
    pollAllYouTube().catch(e => ({ total: 0, accounts: 0, error: e?.message })),
    pollAllVk().catch(e => ({ total: 0, accounts: 0, error: e?.message })),
    scanAllTelegram().catch(e => ({ total: 0, orgs: 0, error: e?.message })),
  ])
  const spikes = await detectNegativeSpikes()

  return NextResponse.json({
    success: true,
    data: {
      twitter: { total: twitter.total, accounts: (twitter as any).perAccount?.length ?? (twitter as any).accounts ?? 0 },
      tiktok,
      youtube,
      vk,
      telegram,
      spikes,
    },
  })
}
