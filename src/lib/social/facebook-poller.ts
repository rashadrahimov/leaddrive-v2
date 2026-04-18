import { prisma } from "@/lib/prisma"
import { decryptToken } from "@/lib/secure-token"
import { classifySentiment } from "@/lib/sentiment"
import crypto from "crypto"

const GRAPH = "https://graph.facebook.com/v21.0"

/**
 * Meta requires `appsecret_proof` (HMAC-SHA256 of the access token, keyed by
 * the app secret) on every server-side call when the app is configured with
 * "Require App Secret" — the new default for Business Login apps. Missing or
 * wrong proof surfaces as OAuth error #10 on /posts even when the token is
 * fine.
 */
function appsecretProof(token: string): string | null {
  const secret = process.env.FACEBOOK_APP_SECRET
  if (!secret) return null
  return crypto.createHmac("sha256", secret).update(token).digest("hex")
}

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
  const proof = appsecretProof(token)
  const proofParam = proof ? `&appsecret_proof=${proof}` : ""
  // /me/posts — /me resolves to the page when using a page access token.
  // /posts returns only the page's own posts (pages_read_engagement is enough),
  // unlike /feed which also needs pages_read_user_content. Using /me bypasses
  // a Meta quirk where /{page_id}/posts errors with #10 even for page admins.
  // Extra fields like reactions.summary / comments.summary re-trigger #10 on
  // some dev-mode Pages — stick to the minimum that worked in probe calls.
  const url = `${GRAPH}/me/posts?fields=id,message,story,created_time,permalink_url&limit=50${sinceParam}&access_token=${encodeURIComponent(token)}${proofParam}`

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
      story?: string
      created_time: string
      permalink_url?: string
      reactions?: { summary?: { total_count: number } }
      comments?: { summary?: { total_count: number } }
      shares?: { count: number }
    }>
  }

  let ingested = 0

  // We deliberately do NOT ingest our own posts — they add noise to the
  // monitoring inbox and never turn into leads. We only fetch them here so
  // we can walk each post's comments below.

  // Pull comments on each recent post — these are the real "mentions" where
  // leads come from. Requires pages_read_user_content.
  for (const post of (data.data || []).slice(0, 20)) {
    const commentsUrl = `${GRAPH}/${post.id}/comments?fields=id,message,from,created_time,like_count&limit=50&access_token=${encodeURIComponent(token)}${proofParam}`
    const cRes = await fetch(commentsUrl)
    if (!cRes.ok) continue
    const cJson = await cRes.json() as {
      data: Array<{ id: string; message?: string; from?: { id: string; name: string }; created_time: string; like_count?: number }>
    }
    for (const c of cJson.data || []) {
      const cText = (c.message || "").trim()
      if (!cText) continue
      const cSent = await classifySentiment(cText)
      try {
        await prisma.socialMention.upsert({
          where: {
            organizationId_platform_externalId: {
              organizationId: account.organizationId,
              platform: "facebook",
              externalId: `c:${c.id}`,
            },
          },
          update: { text: cText, sentiment: cSent, engagement: c.like_count || 0 },
          create: {
            organizationId: account.organizationId,
            accountId: account.id,
            platform: "facebook",
            externalId: `c:${c.id}`,
            text: cText,
            sentiment: cSent,
            matchedTerm: null,
            engagement: c.like_count || 0,
            reach: 0,
            url: post.permalink_url || null,
            authorName: c.from?.name || null,
            authorHandle: c.from?.id || null,
            publishedAt: new Date(c.created_time),
          },
        })
        ingested++
      } catch {}
    }
  }

  // Fetch posts where this page is tagged — these are true external mentions.
  const taggedUrl = `${GRAPH}/me/tagged?fields=id,message,story,created_time,permalink_url,from&limit=25&access_token=${encodeURIComponent(token)}${proofParam}`
  const tRes = await fetch(taggedUrl)
  if (tRes.ok) {
    const tJson = await tRes.json() as {
      data: Array<{ id: string; message?: string; story?: string; created_time: string; permalink_url?: string; from?: { id: string; name: string } }>
    }
    for (const tp of tJson.data || []) {
      const tText = (tp.message || tp.story || "").trim()
      if (!tText) continue
      const tSent = await classifySentiment(tText)
      try {
        await prisma.socialMention.upsert({
          where: {
            organizationId_platform_externalId: {
              organizationId: account.organizationId,
              platform: "facebook",
              externalId: `t:${tp.id}`,
            },
          },
          update: { text: tText, sentiment: tSent },
          create: {
            organizationId: account.organizationId,
            accountId: account.id,
            platform: "facebook",
            externalId: `t:${tp.id}`,
            text: tText,
            sentiment: tSent,
            matchedTerm: null,
            engagement: 0,
            reach: 0,
            url: tp.permalink_url || null,
            authorName: tp.from?.name || null,
            authorHandle: tp.from?.id || null,
            publishedAt: new Date(tp.created_time),
          },
        })
        ingested++
      } catch {}
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
  const proof = appsecretProof(token)
  const proofParam = proof ? `&appsecret_proof=${proof}` : ""
  const mediaUrl = `${GRAPH}/${account.handle}/media?fields=id,caption,permalink,timestamp,username,like_count,comments_count&limit=25&access_token=${encodeURIComponent(token)}${proofParam}`
  const mediaRes = await fetch(mediaUrl)
  if (!mediaRes.ok) {
    console.error("[instagram-poller] media fetch failed:", await mediaRes.text())
    return { ingested: 0, error: "fetch_failed" }
  }
  const mediaJson = await mediaRes.json() as {
    data: Array<{ id: string; caption?: string; permalink?: string; timestamp: string; username?: string; like_count?: number; comments_count?: number }>
  }

  let ingested = 0

  // Own captions are not useful in the monitoring inbox — skip them. We walk
  // the media list only to pull comments and tags underneath each item.

  // Pull comments on each recent media. Requires instagram_manage_comments.
  for (const m of (mediaJson.data || []).slice(0, 20)) {
    const commentsUrl = `${GRAPH}/${m.id}/comments?fields=id,text,username,timestamp,like_count&limit=50&access_token=${encodeURIComponent(token)}${proofParam}`
    const cRes = await fetch(commentsUrl)
    if (!cRes.ok) continue
    const cJson = await cRes.json() as {
      data: Array<{ id: string; text?: string; username?: string; timestamp: string; like_count?: number }>
    }
    for (const c of cJson.data || []) {
      const cText = (c.text || "").trim()
      if (!cText) continue
      const cSent = await classifySentiment(cText)
      try {
        await prisma.socialMention.upsert({
          where: {
            organizationId_platform_externalId: {
              organizationId: account.organizationId,
              platform: "instagram",
              externalId: `c:${c.id}`,
            },
          },
          update: { text: cText, sentiment: cSent, engagement: c.like_count || 0 },
          create: {
            organizationId: account.organizationId,
            accountId: account.id,
            platform: "instagram",
            externalId: `c:${c.id}`,
            text: cText,
            sentiment: cSent,
            matchedTerm: null,
            engagement: c.like_count || 0,
            reach: 0,
            url: m.permalink || null,
            authorHandle: c.username || null,
            publishedAt: new Date(c.timestamp),
          },
        })
        ingested++
      } catch {}
    }
  }

  // Fetch media where this account is tagged (brand mentions). Same scope.
  const tagsUrl = `${GRAPH}/${account.handle}/tags?fields=id,caption,permalink,timestamp,username&limit=25&access_token=${encodeURIComponent(token)}${proofParam}`
  const tRes = await fetch(tagsUrl)
  if (tRes.ok) {
    const tJson = await tRes.json() as {
      data: Array<{ id: string; caption?: string; permalink?: string; timestamp: string; username?: string }>
    }
    for (const tm of tJson.data || []) {
      const tText = (tm.caption || "").trim()
      if (!tText) continue
      const tSent = await classifySentiment(tText)
      try {
        await prisma.socialMention.upsert({
          where: {
            organizationId_platform_externalId: {
              organizationId: account.organizationId,
              platform: "instagram",
              externalId: `t:${tm.id}`,
            },
          },
          update: { text: tText, sentiment: tSent },
          create: {
            organizationId: account.organizationId,
            accountId: account.id,
            platform: "instagram",
            externalId: `t:${tm.id}`,
            text: tText,
            sentiment: tSent,
            matchedTerm: null,
            engagement: 0,
            reach: 0,
            url: tm.permalink || null,
            authorHandle: tm.username || null,
            publishedAt: new Date(tm.timestamp),
          },
        })
        ingested++
      } catch {}
    }
  }

  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { lastPolledAt: new Date() },
  })

  return { ingested }
}
