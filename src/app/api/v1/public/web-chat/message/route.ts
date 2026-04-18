import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { buildWidgetCorsHeaders } from "@/lib/widget-cors"
import { escalateWebChatToTicket } from "@/lib/web-chat-escalate"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendPushToUser } from "@/lib/push-send"

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: await buildWidgetCorsHeaders(req, req.headers.get("origin")) })
}

const schema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1).max(4000),
  lang: z.enum(["en", "ru", "az"]).optional(),
})

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  const headers = await buildWidgetCorsHeaders(req, origin)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400, headers })

  if (!checkRateLimit(`wc-msg:${parsed.data.sessionId}`, { maxRequests: 30, windowMs: 60000 })) {
    return NextResponse.json({ error: "Too many messages, please slow down" }, { status: 429, headers })
  }

  const session = await prisma.webChatSession.findUnique({
    where: { id: parsed.data.sessionId },
  })
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404, headers })

  // Reject messages on closed sessions — visitor must start a new session
  if (session.status === "closed") {
    return NextResponse.json({ error: "Session is closed" }, { status: 410, headers })
  }

  const widget = await prisma.webChatWidget.findUnique({
    where: { organizationId: session.organizationId },
  })
  if (!widget || !widget.enabled) {
    return NextResponse.json({ error: "Widget disabled" }, { status: 403, headers })
  }
  if (widget.allowedOrigins.length > 0 && origin && !widget.allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers })
  }

  const visitorMsg = await prisma.webChatMessage.create({
    data: {
      organizationId: session.organizationId,
      sessionId: session.id,
      fromRole: "visitor",
      text: parsed.data.text,
    },
  })

  await prisma.webChatSession.update({
    where: { id: session.id },
    data: { lastMessageAt: new Date() },
  })

  // Fire web-push to the assigned agent (or all agents if unassigned).
  // Fire-and-forget — never block the visitor's request on push delivery.
  ;(async () => {
    try {
      const visitorName = session.visitorName || session.visitorEmail || "a visitor"
      const preview = parsed.data.text.length > 80 ? parsed.data.text.slice(0, 77) + "…" : parsed.data.text
      const payload = {
        title: `💬 ${visitorName}`,
        body: preview,
        url: `/inbox/web-chat`,
        tag: `ld-webchat-${session.id}`,
      }
      if (session.assignedUserId) {
        await sendPushToUser(session.organizationId, session.assignedUserId, payload)
      } else {
        // Unassigned — notify every admin/manager/support user in the org
        const recipients = await prisma.user.findMany({
          where: { organizationId: session.organizationId, role: { in: ["admin", "manager", "support"] } },
          select: { id: true },
        })
        for (const u of recipients) {
          await sendPushToUser(session.organizationId, u.id, payload)
        }
      }
    } catch (e) {
      console.error("[web-chat] push notify failed:", e)
    }
  })()

  // Auto-escalate: fires once when widget.escalateToTicket=true AND visitor has email on session
  // AND there's no ticket yet. Happens AFTER first real visitor message (not on session start).
  if (widget.escalateToTicket && session.visitorEmail && !session.ticketId) {
    const priorVisitorMsgs = await prisma.webChatMessage.count({
      where: { sessionId: session.id, fromRole: "visitor" },
    })
    // priorVisitorMsgs includes the one we just created, so first-message count = 1
    if (priorVisitorMsgs === 1) {
      escalateWebChatToTicket(session.id, null).catch(e => {
        console.error("[web-chat] auto-escalate failed:", e)
      })
    }
  }

  // Optional AI auto-reply via Da Vinci
  let botReply: { id: string; text: string; createdAt: Date } | null = null
  if (widget.aiEnabled) {
    try {
      const reply = await generateAiReply(session.organizationId, session.id, parsed.data.text, parsed.data.lang)
      if (reply) {
        const botMsg = await prisma.webChatMessage.create({
          data: {
            organizationId: session.organizationId,
            sessionId: session.id,
            fromRole: "bot",
            text: reply,
          },
        })
        botReply = { id: botMsg.id, text: botMsg.text, createdAt: botMsg.createdAt }
      }
    } catch (e) {
      console.error("[web-chat] AI reply failed:", e)
    }
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        message: {
          id: visitorMsg.id,
          fromRole: visitorMsg.fromRole,
          text: visitorMsg.text,
          createdAt: visitorMsg.createdAt,
        },
        botReply,
      },
    },
    { headers },
  )
}

const SYSTEM_PROMPTS: Record<string, string> = {
  en: "You are a helpful website support assistant. Reply briefly (1-3 sentences) in English. If you cannot resolve the question, politely invite the visitor to leave their email so a human can follow up.",
  ru: "Ты — полезный ассистент поддержки на сайте. Отвечай кратко (1–3 предложения) на русском языке. Если не можешь решить вопрос — вежливо попроси оставить email, чтобы оператор связался.",
  az: "Sən veb-saytın dəstək köməkçisisən. Azərbaycanca qısa (1–3 cümlə) cavab ver. Əgər suala cavab verə bilmirsənsə, nəzakətlə e-poçt buraxmağı xahiş et ki, operator geri zəng etsin.",
}

async function generateAiReply(orgId: string, sessionId: string, userText: string, lang?: "en" | "ru" | "az"): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  const history = await prisma.webChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 20,
  })

  const messages = history
    .filter((m: { fromRole: string; text: string }) => m.fromRole !== "bot" || m.text.length < 1500)
    .map((m: { fromRole: string; text: string }) => ({
      role: m.fromRole === "visitor" ? "user" : "assistant",
      content: m.text,
    }))

  if (!messages.length) messages.push({ role: "user", content: userText })

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    const client = new Anthropic({ apiKey })
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPTS[lang || "en"] || SYSTEM_PROMPTS.en,
      messages: messages as any,
    })
    const text = res.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim()
    return text || null
  } catch (e) {
    console.error("[web-chat] Anthropic error:", e)
    return null
  }
}
