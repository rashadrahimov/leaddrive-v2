import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

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

    // 1. Fetch all messages
    const messages = await prisma.channelMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    // 2. Fetch all org contacts to build lookup maps
    const allContacts = await prisma.contact.findMany({
      where: { organizationId: orgId },
      select: { id: true, fullName: true, email: true, phone: true, phones: true },
    })

    // Build lookup maps: email→contactId, phone→contactId
    const emailToContact: Record<string, typeof allContacts[0]> = {}
    const phoneToContact: Record<string, typeof allContacts[0]> = {}
    const contactById: Record<string, typeof allContacts[0]> = {}
    for (const c of allContacts) {
      contactById[c.id] = c
      if (c.email) emailToContact[c.email.toLowerCase()] = c
      // Map primary phone
      if (c.phone) {
        const normalized = c.phone.replace(/[\s\-()]/g, "")
        phoneToContact[normalized] = c
        phoneToContact[c.phone] = c
      }
      // Map all additional phones
      if (c.phones) {
        for (const p of c.phones) {
          if (p) {
            phoneToContact[p] = c
            phoneToContact[p.replace(/[\s\-()]/g, "")] = c
          }
        }
      }
    }

    // 3. Build telegram chatId maps from existing messages
    const chatIdToContact: Record<string, string> = {}
    // Also map chatId → email address for grouping when no contactId exists
    const chatIdToEmail: Record<string, string> = {}
    for (const msg of messages) {
      if (msg.channelType === "telegram") {
        const meta = msg.metadata as any
        const chatId = meta?.chatId as string | undefined
        if (chatId) {
          if (msg.contactId && !chatIdToContact[chatId]) {
            chatIdToContact[chatId] = msg.contactId
          }
          // Outbound with email as `to` — associate chatId with that email
          if (msg.direction === "outbound" && msg.to.includes("@") && !chatIdToEmail[chatId]) {
            chatIdToEmail[chatId] = msg.to.toLowerCase()
          }
        }
      }
    }

    // 4. Resolve each message to a grouping key (contactId preferred)
    function resolveKey(msg: typeof messages[0]): string {
      const meta = msg.metadata as any
      const tgChatId = meta?.chatId as string | undefined

      // If message already has contactId, use it
      if (msg.contactId) return `contact_${msg.contactId}`

      // Try to match by email
      if (msg.channelType === "email" || !msg.channelType) {
        const addr = msg.direction === "inbound" ? msg.from : msg.to
        if (addr) {
          const contact = emailToContact[addr.toLowerCase()]
          if (contact) return `contact_${contact.id}`
        }
      }

      // Try to match by phone (SMS)
      if (msg.channelType === "sms") {
        const phone = msg.direction === "inbound" ? msg.from : msg.to
        if (phone) {
          const normalized = phone.replace(/[\s\-()]/g, "")
          const contact = phoneToContact[normalized] || phoneToContact[phone]
          if (contact) return `contact_${contact.id}`
        }
      }

      // Try to match by WhatsApp phone number
      if (msg.channelType === "whatsapp") {
        const waPhone = meta?.waPhone as string | undefined
        const phone = waPhone || (msg.direction === "inbound" ? msg.from : msg.to)
        if (phone) {
          const normalized = phone.replace(/[\s\-()+ ]/g, "")
          const contact = phoneToContact[normalized] || phoneToContact[`+${normalized}`] || phoneToContact[phone]
          if (contact) return `contact_${contact.id}`
          // Group by WhatsApp phone number even without contact match
          if (waPhone) return `wa_${waPhone}`
        }
      }

      // Try to match by telegram chatId
      if (msg.channelType === "telegram") {
        if (tgChatId && chatIdToContact[tgChatId]) {
          return `contact_${chatIdToContact[tgChatId]}`
        }
        // Also check numeric `to` for outbound
        if (msg.direction === "outbound" && /^-?\d+$/.test(msg.to)) {
          if (chatIdToContact[msg.to]) return `contact_${chatIdToContact[msg.to]}`
        }
        // Outbound telegram might have email as `to` — try email lookup
        if (msg.direction === "outbound" && msg.to.includes("@")) {
          const contact = emailToContact[msg.to.toLowerCase()]
          if (contact) return `contact_${contact.id}`
        }
        // No contact match — try to unify via chatId↔email association
        if (tgChatId && chatIdToEmail[tgChatId]) {
          // Group by email so outbound (to email) and inbound (from chatId) merge
          return `addr_${chatIdToEmail[tgChatId]}`
        }
        // Outbound to email — use that email as grouping key (will match chatId→email above)
        if (msg.direction === "outbound" && msg.to.includes("@")) {
          return `addr_${msg.to.toLowerCase()}`
        }
        // Pure chatId grouping
        if (tgChatId) return `tg_${tgChatId}`
        if (/^-?\d+$/.test(msg.to)) return `tg_${msg.to}`
      }

      // Fallback: try email match for any channel
      const addr = msg.direction === "inbound" ? msg.from : msg.to
      if (addr?.includes("@")) {
        const contact = emailToContact[addr.toLowerCase()]
        if (contact) return `contact_${contact.id}`
      }

      return `addr_${addr || msg.from || "unknown"}`
    }

    // 5. Group messages into threads
    const threads: Record<string, any> = {}

    for (const msg of messages) {
      const key = resolveKey(msg)
      const meta = msg.metadata as any
      const tgChatId = meta?.chatId as string | undefined

      if (!threads[key]) {
        // Resolve contact info from key
        let contactId: string | null = null
        let contactName = msg.direction === "inbound" ? msg.from : msg.to
        let contactEmail: string | null = null
        let contactPhone: string | null = null

        if (key.startsWith("contact_")) {
          contactId = key.replace("contact_", "")
          const c = contactById[contactId]
          if (c) {
            contactName = c.fullName || contactName
            contactEmail = c.email
            contactPhone = c.phone
          }
        }

        threads[key] = {
          contactId,
          contactName,
          contactEmail,
          contactPhone,
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

  const { to, body: msgBody, subject, contactId: rawContactId, channel } = parsed.data

  // Auto-resolve contactId if not provided
  let contactId = rawContactId || undefined
  if (!contactId) {
    let contact = null
    if (channel === "email" && to.includes("@")) {
      contact = await prisma.contact.findFirst({
        where: { organizationId: orgId, email: { equals: to, mode: "insensitive" } },
        select: { id: true },
      })
    } else if (channel === "sms" && to) {
      contact = await prisma.contact.findFirst({
        where: { organizationId: orgId, phone: to },
        select: { id: true },
      })
    } else if (channel === "whatsapp" && to) {
      const cleanPhone = to.replace(/[\s\-()+ ]/g, "")
      contact = await prisma.contact.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            { phone: to },
            { phone: `+${cleanPhone}` },
            { phone: { contains: cleanPhone.slice(-9) } },
          ],
        },
        select: { id: true },
      })
    } else if (channel === "telegram" && /^-?\d+$/.test(to)) {
      // Find a previous message with this chatId that has a contactId
      const prev = await prisma.channelMessage.findFirst({
        where: {
          organizationId: orgId,
          channelType: "telegram",
          contactId: { not: null },
          metadata: { path: ["chatId"], equals: to },
        },
        select: { contactId: true },
      })
      if (prev?.contactId) contactId = prev.contactId
    }
    if (contact) contactId = contact.id
  }

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
        const waResult = await sendWhatsAppMessage({
          to,
          message: msgBody,
          organizationId: orgId,
          contactId,
        })
        status = waResult.success ? "delivered" : "failed"
        if (!waResult.success) errorMsg = waResult.error || "WhatsApp send failed"
        // sendWhatsAppMessage already logs to ChannelMessage, so skip the generic save below
        if (waResult.success) {
          // Update lastContactAt
          if (contactId) {
            await prisma.contact.updateMany({
              where: { id: contactId, organizationId: orgId },
              data: { lastContactAt: new Date() },
            }).catch(() => {})
          }
          return NextResponse.json({ success: true, data: { id: "wa-sent", status: "delivered" } }, { status: 201 })
        }
        break
      }
    }

    // Resolve the actual chatId used for telegram (for grouping)
    let resolvedChatId: string | undefined
    if (channel === "telegram") {
      const tgSettings = ((await prisma.channelConfig.findFirst({
        where: { organizationId: orgId, channelType: "telegram", isActive: true },
        select: { settings: true },
      }))?.settings as any) || {}
      resolvedChatId = /^-?\d+$/.test(to) ? to : tgSettings.chatId
    }

    // Save message to DB
    const meta: any = {}
    if (errorMsg) meta.error = errorMsg
    if (resolvedChatId) meta.chatId = resolvedChatId

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
        metadata: Object.keys(meta).length > 0 ? meta : undefined,
      },
    })

    // Update lastContactAt on the contact
    if (contactId && status === "delivered") {
      await prisma.contact.updateMany({
        where: { id: contactId, organizationId: orgId },
        data: { lastContactAt: new Date() },
      }).catch(() => {})
    }

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
