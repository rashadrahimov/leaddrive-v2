import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import Anthropic from "@anthropic-ai/sdk"

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

    // AI Auto-Reply: only for text messages
    if (msg.type === "text" && text.trim()) {
      try {
        await handleAiAutoReply(orgId, waId, text, contactId, senderName)
      } catch (err) {
        console.error(`[WA Webhook] AI auto-reply error:`, err)
      }
    }
  }
}

// ─── AI Auto-Reply for WhatsApp ───────────────────────────────────────────

const WA_SYSTEM_PROMPT = `Ты — AI-ассистент компании, подключённый через WhatsApp. Твоё имя "LeadDrive AI".

ПРАВИЛА:
1. Отвечай КРАТКО — это мессенджер, не портал. Максимум 2-3 предложения.
2. Будь вежливым и профессиональным.
3. Если есть контекст из базы знаний — используй его.
4. Если вопрос вне компетенции — предложи связаться с менеджером.
5. О ценах не говори — направь к менеджеру.
6. Не используй markdown разметку (жирный, курсив) — WhatsApp их не поддерживает так же.
7. Отвечай на языке клиента.`

async function handleAiAutoReply(
  organizationId: string,
  waPhone: string,
  userMessage: string,
  contactId: string | undefined,
  senderName: string,
) {
  // Check if AI auto-reply is enabled for this org
  const agentConfig = await prisma.aiAgentConfig.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { updatedAt: "desc" },
  })

  // If no active agent config or no API key — skip auto-reply
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[WA AI] No ANTHROPIC_API_KEY — skipping auto-reply")
    return
  }

  // Find or create AI chat session for this WhatsApp phone
  let session = await prisma.aiChatSession.findFirst({
    where: {
      organizationId,
      status: "active",
      metadata: { path: ["waPhone"], equals: waPhone },
    },
  })

  if (!session) {
    session = await prisma.aiChatSession.create({
      data: {
        organizationId,
        portalUserId: contactId || null,
        status: "active",
        metadata: { waPhone, channel: "whatsapp", senderName },
      },
    })
  }

  // Save user message to AI session
  await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: userMessage,
    },
  })

  // Get chat history for context
  const history = await prisma.aiChatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  })

  // Get KB context
  let kbContext = ""
  try {
    const articles = await prisma.kbArticle.findMany({
      where: {
        organizationId,
        status: "published",
        OR: [
          { title: { contains: userMessage, mode: "insensitive" } },
          { content: { contains: userMessage, mode: "insensitive" } },
        ],
      },
      take: 3,
      select: { title: true, content: true },
    })
    if (articles.length > 0) {
      kbContext = "\n\nБАЗА ЗНАНИЙ:\n" + articles.map(a => `## ${a.title}\n${a.content?.slice(0, 300) || ""}`).join("\n\n")
    }
  } catch { /* ignore KB errors */ }

  // Build system prompt
  let systemPrompt = WA_SYSTEM_PROMPT
  if (agentConfig?.systemPrompt) {
    systemPrompt += "\n\nДОПОЛНИТЕЛЬНЫЕ ИНСТРУКЦИИ:\n" + agentConfig.systemPrompt
  }
  systemPrompt += kbContext
  systemPrompt += `\n\nКлиент: ${senderName}\nТелефон: +${waPhone}\nДата: ${new Date().toISOString().split("T")[0]}`

  // Build messages array
  const messages: Array<{ role: "user" | "assistant"; content: string }> = history
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }))

  // Ensure alternating roles
  const cleanMessages = messages.filter((m, i) => {
    if (i === 0) return m.role === "user"
    return m.role !== messages[i - 1]?.role
  })

  if (cleanMessages.length === 0 || cleanMessages[0].role !== "user") {
    cleanMessages.unshift({ role: "user", content: userMessage })
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const model = agentConfig?.model || "claude-haiku-4-5-20251001"
    const maxTokens = Math.min(agentConfig?.maxTokens || 512, 1024) // Keep short for WhatsApp

    const startTime = Date.now()
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: agentConfig?.temperature ?? 0.7,
      system: systemPrompt,
      messages: cleanMessages,
    })

    const aiReply = response.content
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("")
      .replace(/\[ESCALATE\]/g, "")
      .replace(/\[CREATE_TICKET\]/g, "")
      .trim()

    if (!aiReply) return

    // Save AI response to session
    await prisma.aiChatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: aiReply,
      },
    })

    // Update session message count
    await prisma.aiChatSession.update({
      where: { id: session.id },
      data: { messagesCount: { increment: 2 } },
    })

    // Log interaction
    const latencyMs = Date.now() - startTime
    const usage = response.usage
    const costUsd = ((usage?.input_tokens || 0) * 0.001 + (usage?.output_tokens || 0) * 0.005) / 1000
    await prisma.aiInteractionLog.create({
      data: {
        organizationId,
        sessionId: session.id,
        userMessage: userMessage.slice(0, 500),
        aiResponse: aiReply.slice(0, 1000),
        latencyMs,
        promptTokens: usage?.input_tokens || 0,
        completionTokens: usage?.output_tokens || 0,
        costUsd,
        model,
      },
    }).catch(() => {})

    // Send AI reply back via WhatsApp
    const result = await sendWhatsAppMessage({
      to: waPhone,
      message: aiReply,
      organizationId,
      contactId,
    })

    console.log(`[WA AI] Reply to ${waPhone}: ${aiReply.slice(0, 80)}... | ${result.success ? "OK" : result.error}`)
  } catch (err: any) {
    console.error(`[WA AI] Claude API error:`, err.message)
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
