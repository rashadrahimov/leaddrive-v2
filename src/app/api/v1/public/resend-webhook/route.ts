import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"

// POST /api/v1/public/resend-webhook
//   Receives Resend delivery events (delivered, bounced, complained, opened,
//   clicked, etc.) and updates the matching email_logs row by messageId.
//
// Security:
//   - Resend signs each webhook with HMAC-SHA256. We verify the signature
//     header against RESEND_WEBHOOK_SECRET before trusting the payload.
//   - Without the secret env var, the endpoint returns 503 (not configured)
//     so a rogue caller can't spray fake "bounced" events before we're ready.
//
// Configure in Resend dashboard:
//   https://resend.com/webhooks → Add endpoint → URL:
//   https://app.leaddrivecrm.org/api/v1/public/resend-webhook
//   Events: email.delivered, email.bounced, email.complained, email.delivery_delayed
//   Signing secret → paste into .env as RESEND_WEBHOOK_SECRET.

type ResendEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    to?: string[] | string
    from?: string
    subject?: string
    bounce?: { type?: string; message?: string }
  }
}

function verifySvixSignature(
  id: string | null,
  ts: string | null,
  sig: string | null,
  rawBody: string,
  secret: string,
): boolean {
  // Resend uses Svix signatures: "v1,<base64-sig> v1,<base64-sig>" (space-separated).
  // signed_payload = `${id}.${ts}.${body}`, key is the portion after "whsec_" decoded from base64.
  if (!id || !ts || !sig || !secret) return false
  try {
    const keyB64 = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret
    const key = Buffer.from(keyB64, "base64")
    const toSign = `${id}.${ts}.${rawBody}`
    const expected = crypto.createHmac("sha256", key).update(toSign).digest("base64")
    for (const part of sig.split(" ")) {
      const [ver, val] = part.split(",")
      if (ver === "v1" && val && val === expected) return true
    }
    return false
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const expected = process.env.RESEND_WEBHOOK_SECRET
  if (!expected) {
    return NextResponse.json({ error: "Resend webhook not configured" }, { status: 503 })
  }

  // Basic IP rate-limit so a stray load-test can't overwhelm us.
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  if (!checkRateLimit(`resend-webhook:${ip}`, RATE_LIMIT_CONFIG.webhook)) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }

  const rawBody = await req.text()
  const ok = verifySvixSignature(
    req.headers.get("svix-id"),
    req.headers.get("svix-timestamp"),
    req.headers.get("svix-signature"),
    rawBody,
    expected,
  )
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: ResendEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const type = event.type || ""
  const emailId = event.data?.email_id
  if (!emailId) {
    return NextResponse.json({ success: true, skipped: "no email_id" }, { status: 202 })
  }

  // Map Resend event type → status we store in email_logs.
  const status = (() => {
    if (type.endsWith(".delivered")) return "delivered"
    if (type.endsWith(".bounced")) return "bounced"
    if (type.endsWith(".complained")) return "complained"
    if (type.endsWith(".opened")) return "opened"
    if (type.endsWith(".clicked")) return "clicked"
    if (type.endsWith(".delivery_delayed")) return "delayed"
    return null
  })()

  if (!status) {
    return NextResponse.json({ success: true, skipped: `unknown type: ${type}` }, { status: 202 })
  }

  try {
    const log = await prisma.emailLog.findFirst({
      where: { messageId: emailId },
      select: { id: true, organizationId: true, toEmail: true },
    })
    if (!log) {
      return NextResponse.json({ success: true, skipped: "email_log not found" }, { status: 202 })
    }

    const data: Record<string, unknown> = { status }
    if (status === "opened") data.openedAt = new Date()
    if (status === "clicked") data.clickedAt = new Date()
    if (status === "bounced" || status === "complained") {
      data.errorMessage = event.data?.bounce?.message || type
    }

    await prisma.emailLog.update({ where: { id: log.id }, data })

    // Auto-unsubscribe on hard bounce or complaint so we stop sending to this address.
    if (status === "bounced" || status === "complained") {
      const existing = await prisma.surveyUnsubscribe.findFirst({
        where: { organizationId: log.organizationId, email: log.toEmail, surveyId: null },
      })
      if (!existing) {
        await prisma.surveyUnsubscribe.create({
          data: {
            organizationId: log.organizationId,
            email: log.toEmail,
            surveyId: null,
            reason: status === "complained" ? "complaint_via_resend" : "hard_bounce_via_resend",
          },
        })
      }
    }

    return NextResponse.json({ success: true, status, logId: log.id })
  } catch (e) {
    console.error("[resend-webhook] processing failed:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Resend sends a GET on the URL during setup to probe reachability.
export async function GET() {
  return NextResponse.json({ ok: true, service: "resend-webhook" })
}
