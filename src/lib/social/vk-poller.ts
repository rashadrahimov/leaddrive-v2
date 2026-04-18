import { prisma } from "@/lib/prisma"
import { classifySentiment } from "@/lib/sentiment"

/**
 * VK poller — uses newsfeed.search to scan public posts for a brand handle/keyword.
 * Requires env VK_SERVICE_TOKEN (service token, no OAuth needed for search).
 * Monitored `handle` is treated as a search keyword (or #hashtag).
 */

export async function pollVkAccount(accountId: string): Promise<{ ingested: number; error?: string }> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId } })
  if (!account || account.platform !== "vkontakte" || !account.isActive) return { ingested: 0, error: "inactive" }
  const token = process.env.VK_SERVICE_TOKEN
  if (!token) return { ingested: 0, error: "VK_SERVICE_TOKEN not configured" }

  const queries = [account.handle, ...account.keywords].filter(Boolean)
  const url = new URL("https://api.vk.com/method/newsfeed.search")
  url.searchParams.set("q", queries.join(" OR "))
  url.searchParams.set("count", "50")
  url.searchParams.set("access_token", token)
  url.searchParams.set("v", "5.199")

  const res = await fetch(url.toString())
  if (!res.ok) return { ingested: 0, error: `vk search failed ${res.status}` }
  const json = (await res.json()) as {
    response?: { items?: Array<{ id: number; owner_id: number; text?: string; date?: number; likes?: { count: number }; reposts?: { count: number }; comments?: { count: number }; views?: { count: number } }> }
    error?: { error_msg: string }
  }
  if (json.error) return { ingested: 0, error: json.error.error_msg }

  let ingested = 0
  for (const item of json.response?.items || []) {
    if (!item.text) continue
    const externalId = `${item.owner_id}_${item.id}`
    const sentiment = await classifySentiment(item.text)
    const engagement = (item.likes?.count || 0) + (item.reposts?.count || 0) + (item.comments?.count || 0)
    try {
      await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId: account.organizationId,
            platform: "vkontakte",
            externalId,
          },
        },
        update: {
          text: item.text,
          sentiment,
          engagement,
          reach: item.views?.count || 0,
        },
        create: {
          organizationId: account.organizationId,
          accountId: account.id,
          platform: "vkontakte",
          externalId,
          text: item.text,
          url: `https://vk.com/wall${item.owner_id}_${item.id}`,
          sentiment,
          engagement,
          reach: item.views?.count || 0,
          publishedAt: item.date ? new Date(item.date * 1000) : new Date(),
        },
      })
      ingested++
    } catch (e) {
      console.error("[vk-poller] upsert failed", e)
    }
  }
  await prisma.socialAccount.update({ where: { id: account.id }, data: { lastPolledAt: new Date() } })
  return { ingested }
}

export async function pollAllVk(orgId?: string): Promise<{ total: number; accounts: number }> {
  if (!process.env.VK_SERVICE_TOKEN) return { total: 0, accounts: 0 }
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "vkontakte", isActive: true, ...(orgId ? { organizationId: orgId } : {}) },
  })
  let total = 0
  for (const a of accounts) {
    const r = await pollVkAccount(a.id)
    total += r.ingested
  }
  return { total, accounts: accounts.length }
}
