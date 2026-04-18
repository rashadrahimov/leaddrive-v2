import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

const MAX_DAYS = 3650 // ~10 years; enough to cover any archived mentions

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "campaigns", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const days = Math.min(MAX_DAYS, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") || "30", 10)))
  const now = new Date()
  const since = new Date(now.getTime() - days * 86400 * 1000)

  const mentions = await prisma.socialMention.findMany({
    where: {
      organizationId: orgId,
      OR: [
        { publishedAt: { gte: since } },
        { AND: [{ publishedAt: null }, { createdAt: { gte: since } }] },
      ],
    },
    select: {
      platform: true,
      sentiment: true,
      status: true,
      authorHandle: true,
      authorName: true,
      matchedTerm: true,
      engagement: true,
      reach: true,
      publishedAt: true,
      createdAt: true,
    },
    take: 20000,
  })

  // Pick bucket granularity so the time-series stays readable:
  //   ≤ 90 days → daily,  ≤ 365 → weekly (ISO Monday),  otherwise monthly.
  const bucketMode: "day" | "week" | "month" =
    days <= 90 ? "day" : days <= 365 ? "week" : "month"

  const bucketKey = (d: Date): string => {
    if (bucketMode === "day") return d.toISOString().slice(0, 10)
    if (bucketMode === "week") {
      // Round down to Monday so weeks align across buckets.
      const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
      const dow = copy.getUTCDay() || 7 // Sunday → 7 so we subtract 6
      copy.setUTCDate(copy.getUTCDate() - (dow - 1))
      return copy.toISOString().slice(0, 10)
    }
    return d.toISOString().slice(0, 7) + "-01"
  }

  const byDay = new Map<string, { day: string; total: number; positive: number; neutral: number; negative: number; engagement: number }>()
  const stepMs = bucketMode === "day" ? 86400_000 : bucketMode === "week" ? 7 * 86400_000 : 30 * 86400_000
  for (let t = now.getTime(); t >= since.getTime(); t -= stepMs) {
    const key = bucketKey(new Date(t))
    if (!byDay.has(key)) byDay.set(key, { day: key, total: 0, positive: 0, neutral: 0, negative: 0, engagement: 0 })
  }
  const bySentiment = { positive: 0, neutral: 0, negative: 0 }
  const byPlatform = new Map<string, number>()
  const byStatus = new Map<string, number>()
  const byTerm = new Map<string, number>()
  const byAuthor = new Map<string, { handle: string; name: string | null; count: number; platform: string }>()

  let totalEngagement = 0
  let totalReach = 0

  for (const m of mentions) {
    const ts = m.publishedAt || m.createdAt
    const key = bucketKey(ts)
    const bucket = byDay.get(key)
    if (bucket) {
      bucket.total++
      bucket.engagement += m.engagement
      const s = (m.sentiment as "positive" | "neutral" | "negative" | null) || "neutral"
      bucket[s]++
    }

    const s = (m.sentiment as "positive" | "neutral" | "negative" | null) || "neutral"
    bySentiment[s]++
    byPlatform.set(m.platform, (byPlatform.get(m.platform) || 0) + 1)
    byStatus.set(m.status, (byStatus.get(m.status) || 0) + 1)
    if (m.matchedTerm) byTerm.set(m.matchedTerm, (byTerm.get(m.matchedTerm) || 0) + 1)
    if (m.authorHandle) {
      const entry = byAuthor.get(m.authorHandle) || { handle: m.authorHandle, name: m.authorName, count: 0, platform: m.platform }
      entry.count++
      byAuthor.set(m.authorHandle, entry)
    }
    totalEngagement += m.engagement
    totalReach += m.reach
  }

  const timeseries = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day))
  const topPlatforms = Array.from(byPlatform.entries()).map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count)
  const topTerms = Array.from(byTerm.entries()).map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  const topAuthors = Array.from(byAuthor.values()).sort((a, b) => b.count - a.count).slice(0, 10)

  // Spike detection only applies to the daily view — compare today's negative
  // count against the trailing 7-day average. For weekly/monthly buckets the
  // comparison loses meaning, so skip.
  let negativeSpike: { today: number; avg7d: number } | null = null
  if (bucketMode === "day") {
    const todayKey = now.toISOString().slice(0, 10)
    const today = byDay.get(todayKey) || { positive: 0, neutral: 0, negative: 0 }
    let trailing = 0
    let trailingDays = 0
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now.getTime() - i * 86400_000).toISOString().slice(0, 10)
      const b = byDay.get(d)
      if (b) {
        trailing += b.negative
        trailingDays++
      }
    }
    const avg = trailingDays > 0 ? trailing / trailingDays : 0
    if (today.negative >= 3 && today.negative > avg * 2) {
      negativeSpike = { today: today.negative, avg7d: Number(avg.toFixed(1)) }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      range: { days, since: since.toISOString(), until: now.toISOString() },
      totals: {
        mentions: mentions.length,
        engagement: totalEngagement,
        reach: totalReach,
      },
      sentiment: bySentiment,
      status: Object.fromEntries(byStatus),
      timeseries,
      topPlatforms,
      topTerms,
      topAuthors,
      negativeSpike,
    },
  })
}
