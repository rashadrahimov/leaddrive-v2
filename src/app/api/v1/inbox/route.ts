import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const channelFilter = searchParams.get("channel") // email, telegram, sms, whatsapp

  try {
    const where: any = { organizationId: orgId }
    if (channelFilter && channelFilter !== "all") {
      where.channelType = channelFilter
    }

    const messages = await prisma.channelMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    // Group by contact — use contactId first, then try to unify by telegram chatId
    const threads: Record<string, any> = {}
    // Map telegram chatId → thread key for merging
    const chatIdToKey: Record<string, string> = {}

    for (const msg of messages) {
      const meta = msg.metadata as any
      const tgChatId = meta?.chatId as string | undefined

      // Determine grouping key
      let key = msg.contactId || ""
      if (!key) {
        // For telegram messages, group by chatId
        if (msg.channelType === "telegram" && tgChatId) {
          key = chatIdToKey[tgChatId] || `tg_${tgChatId}`
        } else if (msg.channelType === "telegram") {
          // Outbound telegram without metadata chatId — try to match by `to` field
          const toVal = msg.direction === "outbound" ? msg.to : msg.from
          // Check if `to` is a chatId (numeric)
          if (/^-?\d+$/.test(toVal)) {
            key = chatIdToKey[toVal] || `tg_${toVal}`
          } else {
            key = toVal
          }
        } else {
          key = (msg.direction === "inbound" ? msg.from : msg.to) || msg.from
        }
      }

      if (!threads[key]) {
        threads[key] = {
          contactId: msg.contactId,
          contactName: msg.direction === "inbound" ? msg.from : msg.to,
          contactEmail: null,
          contactPhone: null,
          telegramChatId: tgChatId || null,
          lastMessage: msg.body?.slice(0, 100) || "",
          lastMessageAt: msg.createdAt,
          lastChannel: msg.channelType || "email",
          unreadCount: 0,
          messageCount: 0,
          channels: new Set<string>(),
          messages: [],
        }
      }

      // Register chatId → key mapping for future messages
      if (tgChatId && !chatIdToKey[tgChatId]) {
        chatIdToKey[tgChatId] = key
      }
      // Also map numeric `to` for outbound
      if (msg.channelType === "telegram" && msg.direction === "outbound" && /^-?\d+$/.test(msg.to)) {
        if (!chatIdToKey[msg.to]) chatIdToKey[msg.to] = key
      }

      threads[key].messages.push(msg)
      threads[key].messageCount++
      if (msg.channelType) threads[key].channels.add(msg.channelType)
      if (!threads[key].telegramChatId && tgChatId) {
        threads[key].telegramChatId = tgChatId
      }
      if (msg.direction === "inbound" && msg.status !== "read") {
        threads[key].unreadCount++
      }
      // Update contact name from inbound (real name, not chatId)
      if (msg.direction === "inbound" && msg.from && !/^-?\d+$/.test(msg.from)) {
        threads[key].contactName = msg.from
      }
      // Update last message if this is newer
      if (new Date(msg.createdAt) > new Date(threads[key].lastMessageAt)) {
        threads[key].lastMessage = msg.body?.slice(0, 100) || ""
        threads[key].lastMessageAt = msg.createdAt
        threads[key].lastChannel = msg.channelType || "email"
      }
    }

    // Resolve contact names from DB
    const contactIds = Object.values(threads)
      .filter((t: any) => t.contactId)
      .map((t: any) => t.contactId)

    if (contactIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, fullName: true, email: true, phone: true },
      })
      const contactMap = new Map(contacts.map(c => [c.id, c]))
      for (const thread of Object.values(threads)) {
        const contact = contactMap.get(thread.contactId)
        if (contact) {
          thread.contactName = contact.fullName || thread.contactName
          thread.contactEmail = contact.email
          thread.contactPhone = contact.phone
        }
      }
    }

    const conversations = Object.values(threads)
      .map((t: any) => ({ ...t, channels: Array.from(t.channels) }))
      .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())

    // Stats
    const totalMessages = messages.length
    const inboundCount = messages.filter(m => m.direction === "inbound").length
    const outboundCount = messages.filter(m => m.direction === "outbound").length

    return NextResponse.json({
      success: true,
      data: {
        conversations,
        stats: {
          totalMessages,
          inbound: inboundCount,
          outbound: outboundCount,
          conversations: conversations.length,
        },
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { conversations: [], stats: { totalMessages: 0, inbound: 0, outbound: 0, conversations: 0 } },
    })
  }
}

const sendMessageSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1),
  subject: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  channel: z.enum(["email", "telegram", "sms", "whatsapp"]).default("email"),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { to, body: msgBody, subject, contactId, channel } = parsed.data

  try {
    let status = "delivered"
    let errorMsg = ""

    switch (channel) {
      case "email": {
        if (!to.includes("@")) {
          return NextResponse.json({ error: "Для email нужен корректный адрес" }, { status: 400 })
        }
        const result = await sendEmail({
          to,
          subject: subject || "Сообщение из LeadDrive CRM",
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${msgBody.replace(/\n/g, "<br>")}</div>`,
          organizationId: orgId,
          contactId,
        })
        status = result.success ? "delivered" : "failed"
        if (!result.success) errorMsg = result.error || "Email send failed"
        break
      }

      case "telegram": {
        const tgChannel = await prisma.channelConfig.findFirst({
          where: { organizationId: orgId, channelType: "telegram", isActive: true },
        })
        if (!tgChannel?.botToken) {
          return NextResponse.json({ error: "Telegram бот не настроен" }, { status: 400 })
        }
        const tgSettings = (tgChannel.settings as any) || {}
        // Use `to` only if it looks like a numeric chatId, otherwise fallback to settings
        const chatId = /^-?\d+$/.test(to) ? to : (tgSettings.chatId || to)
        if (!chatId) {
          return NextResponse.json({ error: "Не указан Chat ID" }, { status: 400 })
        }
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${tgChannel.botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text: msgBody, parse_mode: "HTML" }),
          })
          const tgData = await tgRes.json()
          status = tgData.ok ? "delivered" : "failed"
          if (!tgData.ok) errorMsg = tgData.description || "Telegram error"
        } catch (err: any) {
          status = "failed"
          errorMsg = err.message
        }
        break
      }

      case "sms": {
        const smsChannel = await prisma.channelConfig.findFirst({
          where: { organizationId: orgId, channelType: "sms", isActive: true },
        })
        if (!smsChannel?.apiKey || !smsChannel?.phoneNumber) {
          return NextResponse.json({ error: "SMS (Twilio) не настроен" }, { status: 400 })
        }
        const smsSettings = (smsChannel.settings as any) || {}
        const accountSid = smsSettings.accountSid
        if (!accountSid) {
          return NextResponse.json({ error: "Twilio Account SID не настроен" }, { status: 400 })
        }
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
          const twilioAuth = Buffer.from(`${accountSid}:${smsChannel.apiKey}`).toString("base64")
          const params = new URLSearchParams({ To: to, From: smsChannel.phoneNumber, Body: msgBody })
          const smsRes = await fetch(twilioUrl, {
            method: "POST",
            headers: { Authorization: `Basic ${twilioAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          })
          const smsData = await smsRes.json()
          status = smsData.sid ? "delivered" : "failed"
          if (!smsData.sid) errorMsg = smsData.message || "Twilio error"
        } catch (err: any) {
          status = "failed"
          errorMsg = err.message
        }
        break
      }

      case "whatsapp": {
        // Placeholder — log only
        console.log(`[Inbox WhatsApp] To: ${to}, Message: ${msgBody}`)
        status = "delivered"
        break
      }
    }

    // Save message to DB
    const message = await prisma.channelMessage.create({
      data: {
        organizationId: orgId,
        direction: "outbound",
        channelType: channel,
        from: "system",
        to,
        subject: subject || undefined,
        body: msgBody,
        status,
        contactId: contactId || undefined,
        metadata: errorMsg ? { error: errorMsg } : undefined,
      },
    })

    if (status === "failed") {
      return NextResponse.json({ success: false, error: errorMsg || "Ошибка отправки" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Mark messages as read
export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { messageIds } = body

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json({ error: "messageIds required" }, { status: 400 })
  }

  try {
    await prisma.channelMessage.updateMany({
      where: {
        id: { in: messageIds },
        organizationId: orgId,
        direction: "inbound",
      },
      data: { status: "read" },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Delete conversation (all messages by IDs)
export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { messageIds } = body

  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return NextResponse.json({ error: "messageIds required" }, { status: 400 })
  }

  try {
    await prisma.channelMessage.deleteMany({
      where: {
        id: { in: messageIds },
        organizationId: orgId,
      },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
