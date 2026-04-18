import { prisma } from "@/lib/prisma"
import { classifySentiment } from "@/lib/sentiment"

/**
 * Telegram channel scanner.
 *
 * The Bot API only lets a bot read messages from channels where it is a member.
 * We assume the org has added their bot to a channel (public or private) and
 * registered that channel as a SocialAccount with handle = @channelusername.
 *
 * Uses `getUpdates` in a loop cursor (via allowed_updates=channel_post) or the
 * Bot-added channel's forwarded-message approach. This implementation uses
 * `forwardMessage` semantics is not ideal — simpler path is polling via
 * `getChatHistory` which requires MTProto (not Bot API). So we stick to
 * `getUpdates` with `allowed_updates=["channel_post"]`: every channel post
 * where the bot is member becomes an update.
 *
 * Env: TELEGRAM_BOT_TOKEN.
 * State kept per bot in a single SocialMention-of-platform="telegram_offset" marker.
 */

const OFFSET_KEY = "__tg_offset__"

async function loadOffset(organizationId: string): Promise<number> {
  const rec = await prisma.socialMention.findUnique({
    where: {
      organizationId_platform_externalId: {
        organizationId,
        platform: "telegram",
        externalId: OFFSET_KEY,
      },
    },
    select: { reach: true },
  }).catch(() => null)
  return rec?.reach ?? 0
}

async function saveOffset(organizationId: string, offset: number): Promise<void> {
  await prisma.socialMention.upsert({
    where: {
      organizationId_platform_externalId: {
        organizationId,
        platform: "telegram",
        externalId: OFFSET_KEY,
      },
    },
    update: { reach: offset, text: `offset=${offset}` },
    create: {
      organizationId,
      platform: "telegram",
      externalId: OFFSET_KEY,
      text: `offset=${offset}`,
      reach: offset,
      sentiment: "neutral",
      status: "ignored",
    },
  })
}

export async function scanTelegramForOrg(organizationId: string): Promise<{ ingested: number; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ingested: 0, error: "TELEGRAM_BOT_TOKEN not configured" }

  const offset = await loadOffset(organizationId)
  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`)
  url.searchParams.set("offset", String(offset))
  url.searchParams.set("limit", "100")
  url.searchParams.set("timeout", "0")
  url.searchParams.set("allowed_updates", JSON.stringify(["channel_post"]))

  const res = await fetch(url.toString())
  if (!res.ok) return { ingested: 0, error: `getUpdates failed ${res.status}` }
  const json = (await res.json()) as {
    ok: boolean
    result?: Array<{
      update_id: number
      channel_post?: { message_id: number; date: number; text?: string; chat: { id: number; title?: string; username?: string } }
    }>
    description?: string
  }
  if (!json.ok) return { ingested: 0, error: json.description || "telegram api error" }

  // Find org's monitored Telegram accounts
  const accounts = await prisma.socialAccount.findMany({
    where: { organizationId, platform: "telegram", isActive: true },
  })
  const accountsByHandle = new Map<string, { id: string; keywords: string[] }>()
  for (const a of accounts) {
    accountsByHandle.set(a.handle.replace(/^@/, "").toLowerCase(), { id: a.id, keywords: a.keywords })
  }

  let ingested = 0
  let maxUpdateId = offset
  for (const u of json.result || []) {
    maxUpdateId = Math.max(maxUpdateId, u.update_id + 1)
    const post = u.channel_post
    if (!post || !post.text || !post.chat.username) continue
    const handle = post.chat.username.toLowerCase()
    const account = accountsByHandle.get(handle)
    if (!account) continue

    // Keyword filter (if any); empty keywords = ingest every post
    if (account.keywords.length > 0) {
      const lower = post.text.toLowerCase()
      if (!account.keywords.some((k: string) => lower.includes(k.toLowerCase()))) continue
    }

    const sentiment = await classifySentiment(post.text)
    const externalId = `${post.chat.id}_${post.message_id}`
    try {
      await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId,
            platform: "telegram",
            externalId,
          },
        },
        update: { text: post.text, sentiment },
        create: {
          organizationId,
          accountId: account.id,
          platform: "telegram",
          externalId,
          text: post.text,
          authorName: post.chat.title,
          authorHandle: post.chat.username,
          url: `https://t.me/${post.chat.username}/${post.message_id}`,
          sentiment,
          publishedAt: new Date(post.date * 1000),
        },
      })
      ingested++
    } catch (e) {
      console.error("[telegram-scanner] upsert failed", e)
    }
  }

  if (maxUpdateId !== offset) await saveOffset(organizationId, maxUpdateId)
  return { ingested }
}

export async function scanAllTelegram(): Promise<{ total: number; orgs: number }> {
  // Prisma's `distinct + select` is unreliable across versions.
  // Materialize all rows and uniquify ourselves — orgs with a Telegram account
  // are a small set in practice.
  const rows = await prisma.socialAccount.findMany({
    where: { platform: "telegram", isActive: true },
    select: { organizationId: true },
  })
  const orgIds = Array.from(new Set<string>(rows.map((r: { organizationId: string }) => r.organizationId)))
  let total = 0
  for (const organizationId of orgIds) {
    const r = await scanTelegramForOrg(organizationId as string)
    total += r.ingested
  }
  return { total, orgs: orgIds.length }
}
