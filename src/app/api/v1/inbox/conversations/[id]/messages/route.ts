import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { text } = await req.json()

  const conv = await prisma.socialConversation.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const channel = conv.channelConfigId
    ? await prisma.channelConfig.findFirst({ where: { id: conv.channelConfigId } })
    : null

  let sent = false

  if (conv.platform === "whatsapp" && channel) {
    const { sendWhatsAppMessage } = await import("@/lib/whatsapp")
    sent = await sendWhatsAppMessage({ to: conv.externalId, message: text, organizationId: orgId })
      .then(r => r.success)
      .catch(() => false)
  } else if (conv.platform === "telegram" && channel) {
    const token = channel.botToken
    const chatId = conv.externalId
    if (token) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      })
      sent = res.ok
    }
  } else if ((conv.platform === "facebook" || conv.platform === "instagram") && channel?.apiKey) {
    const { sendFacebookMessage } = await import("@/lib/facebook")
    sent = await sendFacebookMessage(conv.externalId, text, channel.apiKey, orgId)
  } else if (conv.platform === "vkontakte" && channel?.apiKey) {
    const { sendVkMessage } = await import("@/lib/vkontakte")
    sent = await sendVkMessage(conv.externalId, text, channel.apiKey)
  }

  // Save outbound message
  const msg = await prisma.channelMessage.create({
    data: {
      organizationId: orgId,
      channelConfigId: conv.channelConfigId,
      channelType: conv.platform,
      direction: "outbound",
      from: "agent",
      to: conv.externalId,
      body: text,
      status: sent ? "sent" : "failed",
      messageType: "text",
      conversationId: id,
      metadata: {},
    },
  })

  // Update conversation lastMessage
  await prisma.socialConversation.update({
    where: { id },
    data: { lastMessage: text, lastMessageAt: new Date() },
  })

  return NextResponse.json({ success: true, data: msg })
}
