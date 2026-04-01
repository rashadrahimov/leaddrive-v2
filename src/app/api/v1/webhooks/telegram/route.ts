import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sanitizeLog } from "@/lib/sanitize"

/**
 * Telegram Bot Webhook — receives incoming messages from Telegram.
 * Set webhook via: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://app.leaddrivecrm.org/api/v1/webhooks/telegram?token=<TOKEN>
 */
export async function POST(req: NextRequest) {
  try {
    const botToken = req.nextUrl.searchParams.get("token")
    if (!botToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
    }

    // SECURITY: Verify Telegram secret token header if configured
    // (set via setWebhook's secret_token parameter → sent as X-Telegram-Bot-Api-Secret-Token)
    const telegramSecret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (telegramSecret) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token")
      if (headerSecret !== telegramSecret) {
        console.error("[TG Webhook] Invalid secret token — rejecting request")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await req.json()
    const message = body.message || body.edited_message
    if (!message) {
      return NextResponse.json({ ok: true }) // ignore non-message updates
    }

    const chatId = String(message.chat.id)
    const text = message.text || message.caption || ""
    const fromUser = message.from
    const senderName = [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(" ") || "Unknown"

    // Find channel config by bot token
    const channelConfig = await prisma.channelConfig.findFirst({
      where: { botToken, channelType: "telegram", isActive: true },
    })

    if (!channelConfig) {
      console.log(`[TG Webhook] No active config for bot token ending ...${sanitizeLog(botToken.slice(-6))}`)
      return NextResponse.json({ ok: true })
    }

    const orgId = channelConfig.organizationId

    // Try to match telegram sender to an existing contact
    // 1. Check if any previous message from this chatId has a contactId
    // 2. If not, try matching by telegram username in contact notes/phone
    let contactId: string | undefined = undefined

    const prevMsg = await prisma.channelMessage.findFirst({
      where: {
        organizationId: orgId,
        channelType: "telegram",
        contactId: { not: null },
        metadata: { path: ["chatId"], equals: chatId },
      },
      select: { contactId: true },
    })
    if (prevMsg?.contactId) {
      contactId = prevMsg.contactId
    }

    const savedMsg = await prisma.channelMessage.create({
      data: {
        organizationId: orgId,
        channelConfigId: channelConfig.id,
        direction: "inbound",
        channelType: "telegram",
        contactId,
        from: senderName,
        to: "bot",
        body: text,
        status: "delivered",
        externalId: String(message.message_id),
        metadata: {
          chatId,
          telegramUserId: fromUser?.id,
          username: fromUser?.username,
        },
      },
    })

    // Upsert social conversation for unified inbox
    const { upsertSocialConversation } = await import("@/lib/facebook")
    upsertSocialConversation(
      orgId, "telegram", chatId,
      senderName, text, channelConfig.id
    ).then(conv => {
      prisma.channelMessage.update({
        where: { id: savedMsg.id },
        data: { conversationId: conv.id },
      }).catch(() => {})
    }).catch(() => {})

    // Update lastContactAt
    if (contactId) {
      await prisma.contact.updateMany({
        where: { id: contactId, organizationId: orgId },
        data: { lastContactAt: new Date() },
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[TG Webhook] Error:", err)
    return NextResponse.json({ ok: true }) // always 200 to Telegram
  }
}

// Telegram sends GET to verify webhook
export async function GET() {
  return NextResponse.json({ status: "ok", service: "telegram-webhook" })
}
