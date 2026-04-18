import { prisma } from "@/lib/prisma"
import { classifySentiment } from "@/lib/sentiment"
import { encryptToken, decryptToken } from "@/lib/secure-token"

/**
 * TikTok poller — lists the connected user's videos and ingests comments as mentions.
 *
 * TikTok's public API scope is narrow: we can't search mentions of arbitrary handles,
 * only read videos belonging to the authorized account. So "monitoring" here means
 * "track engagement on your own TikTok posts".
 */

async function refreshTokenIfNeeded(account: { id: string; accessToken: string | null; tokenExpiresAt: Date | null }): Promise<string | null> {
  if (!account.accessToken) return null
  let decrypted: string
  try { decrypted = decryptToken(account.accessToken, "oauth:tiktok") } catch { return null }
  const [access, refresh] = decrypted.split("::")
  const expired = account.tokenExpiresAt && account.tokenExpiresAt.getTime() < Date.now() + 60_000
  if (!expired) return access
  if (!refresh) return null

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  if (!clientKey || !clientSecret) return null
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refresh,
    }).toString(),
  })
  if (!res.ok) {
    await prisma.socialAccount.update({ where: { id: account.id }, data: { isActive: false } }).catch(() => {})
    return null
  }
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number }
  const newStored = encryptToken([json.access_token, json.refresh_token || refresh].join("::"), "oauth:tiktok")
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: {
      accessToken: newStored,
      tokenExpiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
    },
  })
  return json.access_token
}

export async function pollTikTokAccount(accountId: string): Promise<{ ingested: number; error?: string }> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } })
  if (!account || account.platform !== "tiktok" || !account.isActive) {
    return { ingested: 0, error: "not active tiktok account" }
  }
  const token = await refreshTokenIfNeeded(account)
  if (!token) return { ingested: 0, error: "no token" }

  // List user's recent videos (last 20)
  const videoRes = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,view_count,like_count,comment_count,share_count", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ max_count: 20 }),
  })
  if (!videoRes.ok) {
    return { ingested: 0, error: `video list failed ${videoRes.status}` }
  }
  const videoJson = (await videoRes.json()) as {
    data?: { videos?: Array<{ id: string; title?: string; create_time?: number; view_count?: number; like_count?: number; comment_count?: number; share_count?: number }> }
  }

  let ingested = 0
  for (const v of videoJson.data?.videos || []) {
    if (!v.title) continue
    const sentiment = await classifySentiment(v.title)
    try {
      await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId: account.organizationId,
            platform: "tiktok",
            externalId: v.id,
          },
        },
        update: {
          text: v.title,
          reach: v.view_count || 0,
          engagement: (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0),
          sentiment,
        },
        create: {
          organizationId: account.organizationId,
          accountId: account.id,
          platform: "tiktok",
          externalId: v.id,
          text: v.title,
          authorHandle: account.handle,
          authorName: account.displayName,
          url: `https://www.tiktok.com/@${account.handle}/video/${v.id}`,
          sentiment,
          reach: v.view_count || 0,
          engagement: (v.like_count || 0) + (v.comment_count || 0) + (v.share_count || 0),
          publishedAt: v.create_time ? new Date(v.create_time * 1000) : new Date(),
        },
      })
      ingested++
    } catch (e) {
      console.error("[tiktok-poller] upsert failed", e)
    }
  }

  await prisma.socialAccount.update({ where: { id: account.id }, data: { lastPolledAt: new Date() } })
  return { ingested }
}

export async function pollAllTikTok(orgId?: string): Promise<{ total: number; accounts: number }> {
  const accounts = await prisma.socialAccount.findMany({
    where: {
      platform: "tiktok",
      isActive: true,
      accessToken: { not: null },
      ...(orgId ? { organizationId: orgId } : {}),
    },
  })
  let total = 0
  for (const a of accounts) {
    const r = await pollTikTokAccount(a.id)
    total += r.ingested
  }
  return { total, accounts: accounts.length }
}
