import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"

export async function POST(req: NextRequest) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { message, sessionId } = await req.json()
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })

  let session: { id: string; messagesCount: number }

  if (sessionId) {
    // Continue existing session
    const existing = await prisma.aiChatSession.findFirst({
      where: {
        id: sessionId,
        organizationId: user.organizationId,
        portalUserId: user.contactId,
      },
    })
    if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 })
    session = existing
  } else {
    // Create new session
    session = await prisma.aiChatSession.create({
      data: {
        organizationId: user.organizationId,
        portalUserId: user.contactId,
        companyId: user.companyId,
        status: "active",
      },
    })
  }

  // Save user message
  await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: message,
    },
  })

  // Generate mock assistant response (no Claude API call yet)
  const assistantContent =
    `Thank you for your message, ${user.fullName}. ` +
    `I've received your inquiry: "${message.slice(0, 100)}". ` +
    `Our team will review this shortly. In the meantime, you can check our Knowledge Base for common answers or submit a support ticket for urgent issues.`

  // Save assistant message
  const assistantMessage = await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: assistantContent,
    },
  })

  // Update session message count
  await prisma.aiChatSession.update({
    where: { id: session.id },
    data: { messagesCount: { increment: 2 } },
  })

  return NextResponse.json({
    success: true,
    data: {
      sessionId: session.id,
      reply: {
        id: assistantMessage.id,
        role: "assistant",
        content: assistantContent,
        createdAt: assistantMessage.createdAt,
      },
    },
  })
}
