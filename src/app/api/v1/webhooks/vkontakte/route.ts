import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { upsertSocialConversation } from "@/lib/facebook"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const groupId = String(body.group_id)

    const channel = await prisma.channelConfig.findFirst({
      where: { pageId: groupId, channelType: "vkontakte", isActive: true },
    })

    // VK confirmation handshake
    if (body.type === "confirmation") {
      const confirmCode = (channel?.settings as any)?.confirmationCode || "please_set_confirmation_code"
      return new NextResponse(confirmCode, { status: 200, headers: { "Content-Type": "text/plain" } })
    }

    if (!channel) return new NextResponse("ok", { status: 200 })

    if (body.type === "message_new") {
      const msg = body.object?.message
      if (!msg) return new NextResponse("ok")
      const userId = String(msg.from_id)
      const text = msg.text || "[attachment]"

      const conv = await upsertSocialConversation(
        channel.organizationId, "vkontakte", userId,
        userId, text, channel.id
      )

      await prisma.channelMessage.create({
        data: {
          organizationId: channel.organizationId,
          channelConfigId: channel.id,
          channelType: "vkontakte",
          direction: "inbound",
          from: userId,
          to: groupId,
          body: text,
          status: "delivered",
          messageType: "text",
          conversationId: conv.id,
          metadata: { userId, groupId, messageId: msg.id },
        },
      })
    }
    return new NextResponse("ok", { status: 200 })
  } catch (e) {
    console.error("VK webhook error:", e)
    return new NextResponse("ok", { status: 200 })
  }
}
