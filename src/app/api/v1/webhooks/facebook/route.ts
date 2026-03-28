import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { upsertSocialConversation } from "@/lib/facebook"

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")
  if (!VERIFY_TOKEN) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.object !== "page" && body.object !== "instagram") {
      return NextResponse.json({ ok: true })
    }

    for (const entry of body.entry || []) {
      const pageId = entry.id
      // Find channel config by pageId
      const channel = await prisma.channelConfig.findFirst({
        where: { pageId, channelType: { in: ["facebook", "instagram"] }, isActive: true },
      })
      if (!channel) continue

      const platform = body.object === "instagram" ? "instagram" : "facebook"

      for (const event of entry.messaging || []) {
        if (event.message?.is_echo) continue // skip echoes
        const senderId = event.sender?.id
        const text = event.message?.text || "[media]"
        const mediaUrl = event.message?.attachments?.[0]?.payload?.url

        if (!senderId) continue

        const conv = await upsertSocialConversation(
          channel.organizationId, platform, senderId,
          senderId, text, channel.id
        )

        await prisma.channelMessage.create({
          data: {
            organizationId: channel.organizationId,
            channelConfigId: channel.id,
            channelType: platform,
            direction: "inbound",
            from: senderId,
            to: pageId,
            body: text,
            status: "delivered",
            mediaUrl,
            messageType: mediaUrl ? "image" : "text",
            conversationId: conv.id,
            metadata: { senderId, pageId, platform },
          },
        })
      }
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Facebook webhook error:", e)
    return NextResponse.json({ ok: true }) // always 200 to Meta
  }
}
