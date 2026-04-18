import { prisma } from "@/lib/prisma"
import { classifySentiment } from "@/lib/sentiment"
import { encryptToken, decryptToken } from "@/lib/secure-token"

interface TwitterTweet {
  id: string
  text: string
  created_at?: string
  author_id?: string
  public_metrics?: { retweet_count?: number; like_count?: number; reply_count?: number; quote_count?: number }
}

interface TwitterUser {
  id: string
  username: string
  name: string
  profile_image_url?: string
}

interface TwitterSearchResponse {
  data?: TwitterTweet[]
  includes?: { users?: TwitterUser[] }
  meta?: { next_token?: string; newest_id?: string }
}

async function refreshTokenIfNeeded(
  account: { id: string; accessToken: string | null; tokenExpiresAt: Date | null },
): Promise<string | null> {
  if (!account.accessToken) return null
  let decrypted: string
  try {
    decrypted = decryptToken(account.accessToken, "oauth:twitter")
  } catch {
    return null
  }
  const [access, refresh] = decrypted.split("::")
  const isExpired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 60_000
  if (!isExpired) return access
  // If the token is expired and we have no refresh token, the session is unusable —
  // fail fast instead of letting the caller burn quota on a guaranteed-401.
  if (!refresh) return null

  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET
  if (!clientId) return null

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(clientSecret ? { Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64") } : {}),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: clientId,
    }).toString(),
  })
  if (!res.ok) {
    console.error("[twitter-poller] refresh failed:", await res.text())
    // Mark the account inactive so the operator can reconnect instead of us
    // silently burning API quota every polling cycle.
    await prisma.socialAccount.update({ where: { id: account.id }, data: { isActive: false } }).catch(() => {})
    return null
  }
  const json = await res.json() as { access_token: string; refresh_token?: string; expires_in?: number }
  const newStored = encryptToken(
    [json.access_token, json.refresh_token || refresh].join("::"),
    "oauth:twitter",
  )
  const newExpires = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { accessToken: newStored, tokenExpiresAt: newExpires },
  })
  return json.access_token
}

/**
 * Poll a single Twitter SocialAccount for recent mentions.
 * Query = @handle + ORs of keywords.
 * Upserts results into SocialMention.
 */
export async function pollTwitterAccount(accountId: string): Promise<{ ingested: number; error?: string }> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } })
  if (!account || account.platform !== "twitter" || !account.isActive) {
    return { ingested: 0, error: "not active twitter account" }
  }

  const token = await refreshTokenIfNeeded(account)
  if (!token) return { ingested: 0, error: "no token" }

  // Build recent-search query: mentions of handle + keywords
  const parts = [`@${account.handle}`, ...account.keywords.map((k: string) => `"${k.replace(/"/g, "")}"`)]
  const query = parts.map(p => `(${p})`).join(" OR ")

  const url = new URL("https://api.twitter.com/2/tweets/search/recent")
  url.searchParams.set("query", query + " -is:retweet")
  url.searchParams.set("max_results", "25")
  url.searchParams.set("tweet.fields", "created_at,public_metrics,author_id,lang")
  url.searchParams.set("expansions", "author_id")
  url.searchParams.set("user.fields", "username,name,profile_image_url")

  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text()
    console.error("[twitter-poller] search failed:", res.status, body)
    return { ingested: 0, error: `search failed ${res.status}` }
  }
  const data = (await res.json()) as TwitterSearchResponse

  const users = new Map<string, TwitterUser>()
  for (const u of data.includes?.users || []) users.set(u.id, u)

  let ingested = 0
  for (const t of data.data || []) {
    const author = t.author_id ? users.get(t.author_id) : undefined
    const sentiment = await classifySentiment(t.text)
    const metrics = t.public_metrics || {}
    const engagement =
      (metrics.like_count || 0) +
      (metrics.retweet_count || 0) +
      (metrics.reply_count || 0) +
      (metrics.quote_count || 0)

    try {
      await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId: account.organizationId,
            platform: "twitter",
            externalId: t.id,
          },
        },
        update: {
          text: t.text,
          sentiment,
          engagement,
          reach: metrics.retweet_count || 0,
        },
        create: {
          organizationId: account.organizationId,
          accountId: account.id,
          platform: "twitter",
          externalId: t.id,
          text: t.text,
          authorName: author?.name,
          authorHandle: author?.username,
          authorAvatar: author?.profile_image_url,
          url: author ? `https://twitter.com/${author.username}/status/${t.id}` : null,
          sentiment,
          reach: metrics.retweet_count || 0,
          engagement,
          publishedAt: t.created_at ? new Date(t.created_at) : new Date(),
        },
      })
      ingested++
    } catch (e) {
      console.error("[twitter-poller] upsert failed for tweet", t.id, e)
    }
  }

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastPolledAt: new Date() },
  })

  return { ingested }
}

/**
 * Poll all active Twitter accounts for a given org (or all orgs).
 */
export async function pollAllTwitter(orgId?: string): Promise<{ total: number; perAccount: Array<{ accountId: string; handle: string; ingested: number; error?: string }> }> {
  const accounts = await prisma.socialAccount.findMany({
    where: {
      platform: "twitter",
      isActive: true,
      accessToken: { not: null },
      ...(orgId ? { organizationId: orgId } : {}),
    },
  })

  const perAccount: Array<{ accountId: string; handle: string; ingested: number; error?: string }> = []
  let total = 0
  for (const a of accounts) {
    const r = await pollTwitterAccount(a.id)
    perAccount.push({ accountId: a.id, handle: a.handle, ingested: r.ingested, error: r.error })
    total += r.ingested
  }
  return { total, perAccount }
}
