import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Telegram Bot Webhook — receives incoming messages from Telegram.
 * Set webhook via: https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://v2.leaddrivecrm.org/api/v1/webhooks/telegram?token=<TOKEN>
 */
export async function POST(req: NextRequest) {
  try {
    const botToken = req.nextUrl.searchParams.get("token")
    if (!botToken) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 })
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
      console.log(`[TG Webhook] No active config for bot token ending ...${botToken.slice(-6)}`)
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

    await prisma.channelMessage.create({
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
