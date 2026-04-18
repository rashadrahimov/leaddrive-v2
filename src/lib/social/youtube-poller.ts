import { prisma } from "@/lib/prisma"
import { classifySentiment } from "@/lib/sentiment"
import { encryptToken, decryptToken } from "@/lib/secure-token"

/**
 * YouTube poller — fetches recent comments across the authenticated channel
 * via the commentThreads endpoint. For keyword-based mention search across
 * public YouTube, use the Search API (additional quota cost).
 */

async function refreshToken(account: { id: string; accessToken: string | null; tokenExpiresAt: Date | null }): Promise<string | null> {
  if (!account.accessToken) return null
  let decrypted: string
  try { decrypted = decryptToken(account.accessToken, "oauth:youtube") } catch { return null }
  const [access, refresh] = decrypted.split("::")
  const expired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 60_000
  if (!expired) return access
  if (!refresh) return null

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }).toString(),
  })
  if (!res.ok) {
    await prisma.socialAccount.update({ where: { id: account.id }, data: { isActive: false } }).catch(() => {})
    return null
  }
  const j = (await res.json()) as { access_token: string; expires_in?: number }
  const stored = encryptToken([j.access_token, refresh].join("::"), "oauth:youtube")
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken: stored,
      tokenExpiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null,
    },
  })
  return j.access_token
}

export async function pollYouTubeAccount(accountId: string): Promise<{ ingested: number; error?: string }> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } })
  if (!account || account.platform !== "youtube" || !account.isActive) return { ingested: 0, error: "inactive" }
  const token = await refreshToken(account)
  if (!token) return { ingested: 0, error: "no token" }

  // allThreadsRelatedToChannelId fetches comments on videos owned by the channel
  const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads")
  url.searchParams.set("part", "snippet")
  url.searchParams.set("allThreadsRelatedToChannelId", account.handle)
  url.searchParams.set("maxResults", "50")
  url.searchParams.set("order", "time")

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return { ingested: 0, error: `threads failed ${res.status}` }
  const json = (await res.json()) as {
    items?: Array<{
      id: string
      snippet?: {
        videoId?: string
        topLevelComment?: {
          snippet: {
            textDisplay: string
            authorDisplayName?: string
            authorProfileImageUrl?: string
            publishedAt?: string
            likeCount?: number
          }
        }
      }
    }>
  }

  let ingested = 0
  for (const item of json.items || []) {
    const c = item.snippet?.topLevelComment?.snippet
    if (!c || !c.textDisplay) continue
    const sentiment = await classifySentiment(c.textDisplay)
    try {
      await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId: account.organizationId,
            platform: "youtube",
            externalId: item.id,
          },
        },
        update: { text: c.textDisplay, sentiment, engagement: c.likeCount || 0 },
        create: {
          organizationId: account.organizationId,
          accountId: account.id,
          platform: "youtube",
          externalId: item.id,
          text: c.textDisplay,
          authorName: c.authorDisplayName,
          authorAvatar: c.authorProfileImageUrl,
          url: item.snippet?.videoId ? `https://www.youtube.com/watch?v=${item.snippet.videoId}` : null,
          sentiment,
          engagement: c.likeCount || 0,
          publishedAt: c.publishedAt ? new Date(c.publishedAt) : new Date(),
        },
      })
      ingested++
    } catch (e) {
      console.error("[youtube-poller] upsert failed", e)
    }
  }

  await prisma.socialAccount.update({ where: { id: account.id }, data: { lastPolledAt: new Date() } })
  return { ingested }
}

export async function pollAllYouTube(orgId?: string): Promise<{ total: number; accounts: number }> {
  const accounts = await prisma.socialAccount.findMany({
    where: {
      platform: "youtube",
      isActive: true,
      accessToken: { not: null },
      ...(orgId ? { organizationId: orgId } : {}),
    },
  })
  let total = 0
  for (const a of accounts) {
    const r = await pollYouTubeAccount(a.id)
    total += r.ingested
  }
  return { total, accounts: accounts.length }
}
