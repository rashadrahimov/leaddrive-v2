import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { extractReplyToFromToHeader, parseReplyTo } from "@/lib/email-reply-address"
import { executeWorkflows } from "@/lib/workflow-engine"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"

// Shape posted by the Cloudflare Email Worker after it parses the raw MIME.
const inboundSchema = z.object({
  to: z.string().min(1),
  from: z.string().min(1),
  subject: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  html: z.string().optional().nullable(),
  messageId: z.string().optional().nullable(),
  inReplyTo: z.string().optional().nullable(),
})

// POST /api/v1/public/email-inbound
//   Shared secret: X-CF-Inbound-Secret = process.env.CF_INBOUND_SECRET
//   1. Validates the shared secret.
//   2. Extracts ticket/contact id from the `to` address (reply-to token built
//      by `buildReplyTo`). HMAC is verified inside parseReplyTo.
//   3. Creates a public TicketComment on the matching ticket.
//   4. If the ticket was already resolved, re-opens it.
//   5. Logs the inbound email into `email_logs` (direction="inbound") and
//      fires workflows on `ticket.replied`.
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.CF_INBOUND_SECRET
  if (!expectedSecret) {
    return NextResponse.json({ error: "Inbound not configured" }, { status: 503 })
  }

  const providedSecret = req.headers.get("x-cf-inbound-secret")
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate-limit by source IP — prevents abuse if the secret ever leaks (the
  // worker key rotating or a credentials test accidentally logging the value).
  // 600 req/min is ~10/sec — comfortably above CF Email Routing's real
  // throughput for this tenant, but stops anyone from using the endpoint as
  // a free comment-spawner.
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  if (!checkRateLimit(`email-inbound:${ip}`, RATE_LIMIT_CONFIG.webhook)) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = inboundSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const payload = parsed.data

  // 1) Pull the tracked recipient token out of the "To:" header.
  const token =
    extractReplyToFromToHeader(payload.to) ?? parseReplyTo(payload.to)
  if (!token.ok) {
    // Unrecognized destination — log and 202 so the worker doesn't retry.
    console.warn("[email-inbound] unrecognized recipient:", payload.to, token.reason)
    return NextResponse.json({ success: false, skipped: "unrecognized_recipient" }, { status: 202 })
  }

  const body_text = payload.text || (payload.html ? stripHtml(payload.html) : "")
  if (!body_text.trim()) {
    return NextResponse.json({ success: false, skipped: "empty_body" }, { status: 202 })
  }

  try {
    if (token.kind === "ticket") {
      const ticket = await prisma.ticket.findFirst({
        where: { id: token.id },
        select: {
          id: true,
          organizationId: true,
          status: true,
          subject: true,
          contactId: true,
          tags: true,
        },
      })
      if (!ticket) {
        return NextResponse.json({ success: false, skipped: "ticket_not_found" }, { status: 202 })
      }

      const trimmed = stripReplyQuotes(body_text).slice(0, 10000)
      // Prefix with 📧 so the UI can render a "via email" badge without needing
      // an extra JOIN against email_logs. The marker is stripped from the
      // display text client-side.
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          comment: `📧 ${trimmed}`,
          isInternal: false,
        },
      })

      // Re-open resolved/closed tickets on customer reply (standard helpdesk UX).
      const wasResolved = ticket.status === "resolved" || ticket.status === "closed"
      if (wasResolved) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: "open", resolvedAt: null, closedAt: null },
        })
      }

      await prisma.emailLog.create({
        data: {
          organizationId: ticket.organizationId,
          direction: "inbound",
          fromEmail: payload.from.slice(0, 255),
          toEmail: payload.to.slice(0, 255),
          subject: (payload.subject || "").slice(0, 500),
          body: trimmed,
          status: "received",
          messageId: payload.messageId || null,
          contactId: ticket.contactId || null,
        },
      }).catch(() => {})

      logAudit(ticket.organizationId, "reply", "ticket", ticket.id, ticket.subject, {
        newValue: { via: "email_inbound", from: payload.from },
      })
      executeWorkflows(ticket.organizationId, "ticket", "replied", {
        id: ticket.id,
        status: wasResolved ? "open" : ticket.status,
      }).catch(() => {})

      return NextResponse.json({ success: true, data: { ticketId: ticket.id, reopened: wasResolved } })
    }

    // kind === "contact" — reply to a portal registration / survey etc.
    // Try to attach as a comment on the most recent open ticket for that contact,
    // otherwise just log it so it doesn't get silently dropped.
    const contact = await prisma.contact.findFirst({
      where: { id: token.id },
      select: { id: true, organizationId: true, fullName: true },
    })
    if (!contact) {
      return NextResponse.json({ success: false, skipped: "contact_not_found" }, { status: 202 })
    }
    const openTicket = await prisma.ticket.findFirst({
      where: { contactId: contact.id, status: { notIn: ["closed", "resolved"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, subject: true },
    })

    if (openTicket) {
      await prisma.ticketComment.create({
        data: {
          ticketId: openTicket.id,
          comment: `📧 ${stripReplyQuotes(body_text).slice(0, 10000)}`,
          isInternal: false,
        },
      })
    }

    await prisma.emailLog.create({
      data: {
        organizationId: contact.organizationId,
        direction: "inbound",
        fromEmail: payload.from.slice(0, 255),
        toEmail: payload.to.slice(0, 255),
        subject: (payload.subject || "").slice(0, 500),
        body: body_text.slice(0, 10000),
        status: "received",
        messageId: payload.messageId || null,
        contactId: contact.id,
      },
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      data: { contactId: contact.id, attachedTo: openTicket?.id || null },
    })
  } catch (e) {
    console.error("[email-inbound] processing failed:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Very light HTML → text conversion — mirrors what's in src/lib/email.ts
// without pulling the whole module in (this endpoint runs on server-only paths).
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// Strip quoted previous messages ("> On 2026-01-01, X wrote:") so we only keep
// the actual reply body. Not perfect but good enough for 95% of Gmail replies.
function stripReplyQuotes(text: string): string {
  const lines = text.split("\n")
  const cut = lines.findIndex((l) => /^On .+wrote:$/i.test(l.trim()) || /^-{2,}\s*Original Message/i.test(l.trim()))
  const kept = cut >= 0 ? lines.slice(0, cut) : lines
  return kept.filter((l) => !/^>/.test(l.trim())).join("\n").trim()
}
