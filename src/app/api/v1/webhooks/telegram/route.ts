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

    // Try to find a contact with this telegram chatId in metadata or by name
    let contactId: string | undefined
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      select: { id: true, firstName: true, lastName: true, phone: true, customFields: true },
      take: 500,
    })

    for (const c of contacts) {
      const cf = c.customFields as any
      if (cf?.telegramChatId === chatId || cf?.telegram_chat_id === chatId) {
        contactId = c.id
        break
      }
    }

    // Save incoming message
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
