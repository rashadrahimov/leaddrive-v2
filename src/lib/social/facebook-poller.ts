import { prisma } from "@/lib/prisma"
import { decryptToken } from "@/lib/secure-token"
import { classifySentiment } from "@/lib/sentiment"

const GRAPH = "https://graph.facebook.com/v21.0"

/**
 * Poll a Facebook Page's feed and capture every post as a mention.
 * The page access token is stored encrypted on the SocialAccount row.
 *
 * For richer "brand monitoring" we'd also pull page.tagged, but /tagged
 * requires `pages_read_user_content` which is App-Review-gated — we keep
 * this poller to the page's own posts for the first iteration.
 */
export async function pollFacebookAccount(accountId: string): Promise<{ ingested: number; error?: string }> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } })
  if (!account || account.platform !== "facebook") return { ingested: 0, error: "not_found" }
  if (!account.accessToken) return { ingested: 0, error: "no_token" }

  let token: string
  try {
    token = decryptToken(account.accessToken, `oauth:facebook:${account.handle}`)
  } catch (e) {
    console.error("[facebook-poller] decrypt failed:", e)
    return { ingested: 0, error: "token_decrypt_failed" }
  }

  const sinceParam = account.lastPolledAt
    ? `&since=${Math.floor(account.lastPolledAt.getTime() / 1000)}`
    : ""
  const url = `${GRAPH}/${account.handle}/feed?fields=id,message,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares,from&limit=50${sinceParam}&access_token=${encodeURIComponent(token)}`

  const res = await fetch(url)
  if (!res.ok) {
    const errText = await res.text()
    console.error("[facebook-poller] fetch failed:", errText)
    return { ingested: 0, error: "fetch_failed" }
  }
  const data = await res.json() as {
    data: Array<{
      id: string
      message?: string
      created_time: string
      permalink_url?: string
      reactions?: { summary?: { total_count: number } }
      comments?: { summary?: { total_count: number } }
      shares?: { count: number }
      from?: { id: string; name: string }
    }>
  }

  let ingested = 0
  const keywords = account.keywords || []

  for (const post of data.data || []) {
    const text = (post.message || "").trim()
    if (!text) continue

    // If keywords configured, require at least one to match.
    let matchedTerm: string | null = null
    if (keywords.length > 0) {
      const lower = text.toLowerCase()
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) { matchedTerm = kw; break }
      }
      if (!matchedTerm) continue
    }

    const sentiment = await classifySentiment(text)
    const engagement =
      (post.reactions?.summary?.total_count || 0) +
      (post.comments?.summary?.total_count || 0) +
      (post.shares?.count || 0)

    try {
      await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId: account.organizationId,
            platform: "facebook",
            externalId: post.id,
          },
        },
        update: {
          text,
          sentiment,
          engagement,
          url: post.permalink_url || null,
          authorName: post.from?.name || null,
          authorHandle: post.from?.id || null,
          publishedAt: new Date(post.created_time),
        },
        create: {
          organizationId: account.organizationId,
          accountId: account.id,
          platform: "facebook",
          externalId: post.id,
          text,
          sentiment,
          matchedTerm,
          engagement,
          reach: 0,
          url: post.permalink_url || null,
          authorName: post.from?.name || null,
          authorHandle: post.from?.id || null,
          publishedAt: new Date(post.created_time),
        },
      })
      ingested++
    } catch (e) {
      console.error("[facebook-poller] upsert failed for post", post.id, e)
    }
  }

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastPolledAt: new Date() },
  })

  return { ingested }
}

/**
 * Poll an Instagram Business account for recent media + comments on that media.
 * The page token grants access to the linked IG business account.
 */
export async function pollInstagramAccount(accountId: string): Promise<{ ingested: number; error?: string }> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } })
  if (!account || account.platform !== "instagram") return { ingested: 0, error: "not_found" }
  if (!account.accessToken) return { ingested: 0, error: "no_token" }

  let token: string
  try {
    token = decryptToken(account.accessToken, `oauth:instagram:${account.handle}`)
  } catch (e) {
    console.error("[instagram-poller] decrypt failed:", e)
    return { ingested: 0, error: "token_decrypt_failed" }
  }

  // First — recent media on the IG business account.
  const mediaUrl = `${GRAPH}/${account.handle}/media?fields=id,caption,permalink,timestamp,username,like_count,comments_count&limit=25&access_token=${encodeURIComponent(token)}`
  const mediaRes = await fetch(mediaUrl)
  if (!mediaRes.ok) {
    console.error("[instagram-poller] media fetch failed:", await mediaRes.text())
    return { ingested: 0, error: "fetch_failed" }
  }
  const mediaJson = await mediaRes.json() as {
    data: Array<{ id: string; caption?: string; permalink?: string; timestamp: string; username?: string; like_count?: number; comments_count?: number }>
  }

  let ingested = 0
  const keywords = account.keywords || []

  for (const m of mediaJson.data || []) {
    const text = (m.caption || "").trim()
    if (!text) continue

    let matchedTerm: string | null = null
    if (keywords.length > 0) {
      const lower = text.toLowerCase()
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) { matchedTerm = kw; break }
      }
      if (!matchedTerm) continue
    }

    const sentiment = await classifySentiment(text)
    const engagement = (m.like_count || 0) + (m.comments_count || 0)

    try {
      await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId: account.organizationId,
            platform: "instagram",
            externalId: m.id,
          },
        },
        update: {
          text,
          sentiment,
          engagement,
          url: m.permalink || null,
          authorHandle: m.username || null,
          publishedAt: new Date(m.timestamp),
        },
        create: {
          organizationId: account.organizationId,
          accountId: account.id,
          platform: "instagram",
          externalId: m.id,
          text,
          sentiment,
          matchedTerm,
          engagement,
          reach: 0,
          url: m.permalink || null,
          authorHandle: m.username || null,
          publishedAt: new Date(m.timestamp),
        },
      })
      ingested++
    } catch (e) {
      console.error("[instagram-poller] upsert failed for media", m.id, e)
    }
  }

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastPolledAt: new Date() },
  })

  return { ingested }
}
