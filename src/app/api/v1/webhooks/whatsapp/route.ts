import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * WhatsApp Cloud API Webhook
 *
 * Setup in Meta App Dashboard → WhatsApp → Configuration:
 *   Callback URL: https://v2.leaddrivecrm.org/api/v1/webhooks/whatsapp
 *   Verify Token: (value of WHATSAPP_VERIFY_TOKEN env var)
 *   Subscribe to: messages
 */

// GET — Meta webhook verification (hub.challenge)
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "leaddrive-whatsapp-verify-2026"

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[WA Webhook] Verification successful")
    return new NextResponse(challenge, { status: 200 })
  }

  console.log("[WA Webhook] Verification failed — token mismatch")
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// POST — Incoming messages from WhatsApp Cloud API
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Meta sends various webhook event types — we only care about messages
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value) {
      return NextResponse.json({ ok: true })
    }

    // Handle message status updates (sent, delivered, read)
    if (value.statuses) {
      for (const status of value.statuses) {
        await handleStatusUpdate(status)
      }
      return NextResponse.json({ ok: true })
    }

    // Handle incoming messages
    const messages = value.messages
    if (!messages || messages.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const metadata = value.metadata // { display_phone_number, phone_number_id }
    const phoneNumberId = metadata?.phone_number_id
    const contacts = value.contacts // [{ profile: { name }, wa_id }]

    // Find channel config by phone number ID
    const channelConfig = await prisma.channelConfig.findFirst({
      where: {
        channelType: "whatsapp",
        phoneNumber: phoneNumberId,
        isActive: true,
      },
    })

    if (!channelConfig) {
      // Fallback: try to find any active whatsapp config
      const fallbackConfig = await prisma.channelConfig.findFirst({
        where: { channelType: "whatsapp", isActive: true },
      })

      if (!fallbackConfig) {
        console.log(`[WA Webhook] No active WhatsApp config for phone_number_id: ${phoneNumberId}`)
        return NextResponse.json({ ok: true })
      }

      // Use fallback
      await processMessages(messages, contacts, fallbackConfig)
      return NextResponse.json({ ok: true })
    }

    await processMessages(messages, contacts, channelConfig)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[WA Webhook] Error:", err)
    // Always return 200 to Meta to avoid webhook retries
    return NextResponse.json({ ok: true })
  }
}

async function processMessages(
  messages: any[],
  contacts: any[],
  channelConfig: { id: string; organizationId: string }
) {
  const orgId = channelConfig.organizationId

  for (const msg of messages) {
    const waId = msg.from // sender's phone number (e.g. "994501234567")
    const messageId = msg.id // wamid.xxx
    const timestamp = msg.timestamp // unix timestamp
    const contactProfile = contacts?.find((c: any) => c.wa_id === waId)
    const senderName = contactProfile?.profile?.name || waId

    // Extract message text based on type
    let text = ""
    let messageType = msg.type || "text"

    switch (msg.type) {
      case "text":
        text = msg.text?.body || ""
        break
      case "image":
        text = msg.image?.caption || "[Изображение]"
        messageType = "image"
        break
      case "video":
        text = msg.video?.caption || "[Видео]"
        messageType = "video"
        break
      case "audio":
        text = "[Аудио сообщение]"
        messageType = "audio"
        break
      case "voice":
        text = "[Голосовое сообщение]"
        messageType = "voice"
        break
      case "document":
        text = msg.document?.caption || `[Документ: ${msg.document?.filename || "file"}]`
        messageType = "document"
        break
      case "sticker":
        text = "[Стикер]"
        messageType = "sticker"
        break
      case "location":
        text = `[Локация: ${msg.location?.latitude}, ${msg.location?.longitude}]`
        messageType = "location"
        break
      case "contacts":
        text = "[Контакт]"
        messageType = "contacts"
        break
      case "reaction":
        text = `[Реакция: ${msg.reaction?.emoji || ""}]`
        messageType = "reaction"
        break
      case "button":
        text = msg.button?.text || "[Кнопка]"
        break
      case "interactive":
        text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[Интерактив]"
        break
      default:
        text = `[${msg.type || "unknown"}]`
    }

    // Skip reaction messages (don't create separate message records)
    if (msg.type === "reaction") continue

    // Try to match sender phone to existing contact
    let contactId: string | undefined

    // 1. Check previous WhatsApp messages from this number
    const prevMsg = await prisma.channelMessage.findFirst({
      where: {
        organizationId: orgId,
        channelType: "whatsapp",
        contactId: { not: null },
        metadata: { path: ["waPhone"], equals: waId },
      },
      select: { contactId: true },
    })

    if (prevMsg?.contactId) {
      contactId = prevMsg.contactId
    } else {
      // 2. Try matching by phone number in contacts table
      // WhatsApp sends numbers like "994501234567", contacts may have "+994501234567" or "994 50 123 45 67"
      const phoneVariants = [
        waId,
        `+${waId}`,
      ]

      const matchedContact = await prisma.contact.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            { phone: { in: phoneVariants } },
            // Also try raw match removing all formatting
            ...phoneVariants.map(p => ({ phone: { contains: p.slice(-9) } })),
          ],
        },
        select: { id: true },
      })

      if (matchedContact) {
        contactId = matchedContact.id
      }
    }

    // Create inbound message
    await prisma.channelMessage.create({
      data: {
        organizationId: orgId,
        channelConfigId: channelConfig.id,
        direction: "inbound",
        channelType: "whatsapp",
        contactId,
        from: senderName,
        to: "system",
        body: text,
        status: "delivered",
        externalId: messageId,
        metadata: {
          waPhone: waId,
          waMessageId: messageId,
          waMessageType: messageType,
          profileName: senderName,
          timestamp: timestamp ? Number(timestamp) : undefined,
        },
      },
    })

    // Update lastContactAt
    if (contactId) {
      await prisma.contact.updateMany({
        where: { id: contactId, organizationId: orgId },
        data: { lastContactAt: new Date() },
      }).catch(() => {})
    }

    console.log(`[WA Webhook] Inbound from ${waId} (${senderName}): ${text.slice(0, 50)}`)
  }
}

// Handle delivery status updates (sent → delivered → read)
async function handleStatusUpdate(status: any) {
  const waMessageId = status.id
  const newStatus = status.status // sent, delivered, read, failed

  if (!waMessageId) return

  // Map WhatsApp status to our status
  const statusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  }

  const mappedStatus = statusMap[newStatus]
  if (!mappedStatus) return

  // Update our outbound message status
  await prisma.channelMessage.updateMany({
    where: {
      externalId: waMessageId,
      direction: "outbound",
    },
    data: { status: mappedStatus },
  }).catch(() => {})

  if (newStatus === "failed") {
    const errorInfo = status.errors?.[0]
    console.error(`[WA Webhook] Message ${waMessageId} failed:`, errorInfo?.title || "unknown error")
  }
}
