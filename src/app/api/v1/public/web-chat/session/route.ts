import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { buildWidgetCorsHeaders, isOriginAllowed } from "@/lib/widget-cors"
import { checkRateLimit } from "@/lib/rate-limit"

export async function OPTIONS(req: NextRequest) {
  // Preflight: echo origin if whitelisted, otherwise deny
  const origin = req.headers.get("origin")
  return new NextResponse(null, { status: 204, headers: await buildWidgetCorsHeaders(req, origin) })
}

const schema = z.object({
  key: z.string().min(1),
  visitorName: z.string().max(200).optional(),
  visitorEmail: z.string().email().optional().or(z.literal("")),
  visitorPhone: z.string().max(50).optional(),
  pageUrl: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  const headers = await buildWidgetCorsHeaders(req, origin)

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!checkRateLimit(`wc-session:${ip}`, { maxRequests: 5, windowMs: 60000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400, headers })
  }

  const widget = await prisma.webChatWidget.findUnique({ where: { publicKey: parsed.data.key } })
  if (!widget || !widget.enabled) {
    return NextResponse.json({ error: "Widget not available" }, { status: 404, headers })
  }
  if (!isOriginAllowed(req, origin, widget.allowedOrigins)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers })
  }

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
  const userAgent = req.headers.get("user-agent") || null

  // Link to existing CRM contact by email match
  let contactId: string | null = null
  if (parsed.data.visitorEmail) {
    const existing = await prisma.contact.findFirst({
      where: { organizationId: widget.organizationId, email: parsed.data.visitorEmail },
      select: { id: true },
    })
    contactId = existing?.id ?? null
  }

  const session = await prisma.webChatSession.create({
    data: {
      organizationId: widget.organizationId,
      visitorName: parsed.data.visitorName || null,
      visitorEmail: parsed.data.visitorEmail || null,
      visitorPhone: parsed.data.visitorPhone || null,
      contactId,
      pageUrl: parsed.data.pageUrl || null,
      userAgent,
      ipAddress,
    },
  })

  const greeting = widget.greeting || "Hi! How can we help?"
  await prisma.webChatMessage.create({
    data: {
      organizationId: widget.organizationId,
      sessionId: session.id,
      fromRole: "bot",
      text: greeting,
    },
  })

  return NextResponse.json(
    { success: true, data: { sessionId: session.id, greeting } },
    { headers },
  )
}
