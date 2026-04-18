import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

const MAX_DAYS = 180

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

  // Daily time-series: mentions + sentiment per day
  const byDay = new Map<string, { day: string; total: number; positive: number; neutral: number; negative: number; engagement: number }>()
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() - i * 86400 * 1000)
    const key = d.toISOString().slice(0, 10)
    byDay.set(key, { day: key, total: 0, positive: 0, neutral: 0, negative: 0, engagement: 0 })
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
    const key = ts.toISOString().slice(0, 10)
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

  // Spike detection: compare today's negative count against trailing 7-day average
  const todayKey = now.toISOString().slice(0, 10)
  const today = byDay.get(todayKey) || { positive: 0, neutral: 0, negative: 0 }
  let trailing = 0
  let trailingDays = 0
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getTime() - i * 86400 * 1000).toISOString().slice(0, 10)
    const b = byDay.get(d)
    if (b) {
      trailing += b.negative
      trailingDays++
    }
  }
  const avg = trailingDays > 0 ? trailing / trailingDays : 0
  const negativeSpike = today.negative >= 3 && today.negative > avg * 2 ? { today: today.negative, avg7d: Number(avg.toFixed(1)) } : null

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
