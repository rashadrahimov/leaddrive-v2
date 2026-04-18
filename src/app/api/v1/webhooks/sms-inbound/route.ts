import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Inbound SMS webhook — receives delivery & reply events from the SMS provider.
 * Handles STOP/UNSUBSCRIBE keywords to comply with CAN-SPAM / TCPA.
 *
 * The specific SMS provider (Twilio / Vonage / ATL) should be configured to POST
 * to this endpoint per organization. We identify the organization by `orgId` query
 * param (set in the provider's inbound URL) OR by a provider-specific secret header.
 *
 * Expected body (Twilio-style x-www-form-urlencoded or JSON):
 *   - From (E.164)
 *   - Body (text)
 *   - To (our number)
 *
 * Returns 200 with empty TwiML so Twilio doesn't retry.
 */

const STOP_KEYWORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "стоп", "отписаться"])

async function parseBody(req: NextRequest): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") || ""
  if (ct.includes("application/json")) {
    const j = await req.json().catch(() => null)
    return (j && typeof j === "object") ? (j as Record<string, string>) : {}
  }
  // Treat as form
  const text = await req.text()
  const params = new URLSearchParams(text)
  const out: Record<string, string> = {}
  for (const [k, v] of params) out[k] = v
  return out
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get("orgId")
  if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 })

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
  if (!org) return NextResponse.json({ error: "Unknown org" }, { status: 404 })

  const data = await parseBody(req)
  const from = (data.From || data.from || data.msisdn || "").trim()
  const body = (data.Body || data.body || data.text || "").trim()
  if (!from || !body) return emptyTwimlResponse()

  const first = body.toLowerCase().split(/\s+/)[0] || ""
  if (STOP_KEYWORDS.has(first)) {
    // Suppress all future survey SMS to this number for this org
    try {
      const existing = await prisma.surveyUnsubscribe.findFirst({
        where: { organizationId: orgId, phone: from, surveyId: null },
      })
      if (!existing) {
        await prisma.surveyUnsubscribe.create({
          data: { organizationId: orgId, phone: from, surveyId: null, reason: "sms_stop" },
        })
      }
      console.log(`[sms-inbound] STOP from ${from} for org ${orgId}`)
    } catch (e) {
      console.error("[sms-inbound] unsubscribe failed:", e)
    }
  }

  return emptyTwimlResponse()
}

function emptyTwimlResponse(): NextResponse {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  })
}
