import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAiFeatureEnabled, checkAiBudget } from "@/lib/ai/budget"
import { processMeetingRecap, writeMeetingRecapShadowAction } from "@/lib/ai/meeting-recap"

/**
 * Generic meeting-recap webhook receiver.
 *
 * Works with Fireflies.ai / Otter / custom integrations.
 * Configure your provider to POST here after transcript is ready.
 *
 * Auth options (in order of preference):
 * 1. HMAC signature header `x-meeting-webhook-signature` (if process.env.MEETING_WEBHOOK_SECRET is set)
 * 2. Organization-scoped API key via `x-organization-id` + `x-api-key` headers
 *
 * Expected body shape (flexible — extract what's there):
 * {
 *   "orgId": "<your-crm-org-id>",               // required
 *   "title": "<meeting title>",
 *   "date": "<ISO date>",                        // when the meeting happened
 *   "participants": ["a@b.com", "c@d.com"],     // emails
 *   "transcript": "<full transcript text>",     // plain text, speaker prefixes OK
 *   "providerId": "<fireflies meeting id>"      // optional dedup key
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const orgId = String(body.orgId || "").trim()
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 })

    // Auth: HMAC or shared secret header
    const providedSecret = req.headers.get("x-meeting-webhook-secret") || ""
    const expectedSecret = process.env.MEETING_WEBHOOK_SECRET || process.env.CRON_SECRET || ""
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify org exists
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
    if (!org) return NextResponse.json({ error: "Unknown organization" }, { status: 404 })

    // Feature flag check
    const liveEnabled = await isAiFeatureEnabled(orgId, "ai_auto_meeting_recap")
    const shadowEnabled = await isAiFeatureEnabled(orgId, "ai_auto_meeting_recap_shadow")
    if (!liveEnabled && !shadowEnabled) {
      return NextResponse.json({ skipped: true, reason: "meeting_recap feature not enabled" })
    }

    const budget = await checkAiBudget(orgId)
    if (!budget.allowed) {
      return NextResponse.json({ skipped: true, reason: "budget exceeded" })
    }

    // Dedup on providerId (if present)
    const providerId = String(body.providerId || "").trim() || undefined
    if (providerId) {
      const dup = await prisma.aiShadowAction.findFirst({
        where: {
          organizationId: orgId,
          featureName: { in: ["ai_auto_meeting_recap", "ai_auto_meeting_recap_shadow"] },
          payload: { path: ["providerId"], equals: providerId },
        },
      })
      if (dup) return NextResponse.json({ skipped: true, reason: "duplicate providerId" })
    }

    const participants: string[] = Array.isArray(body.participants)
      ? body.participants.filter((p: any) => typeof p === "string")
      : []
    const transcript = String(body.transcript || "")
    if (!transcript.trim() || participants.length === 0) {
      return NextResponse.json({ skipped: true, reason: "empty transcript or no participants" })
    }

    const title = String(body.title || "Untitled meeting").slice(0, 200)
    const meetingDate = body.date ? new Date(body.date) : new Date()

    const draft = await processMeetingRecap({
      orgId, title, participants, transcript, meetingDate, providerId,
    })
    if (!draft) {
      return NextResponse.json({ skipped: true, reason: "no CRM-matched participants" })
    }

    const now = new Date()
    await writeMeetingRecapShadowAction(orgId, { orgId, title, participants, transcript, meetingDate, providerId }, draft, now, !liveEnabled)

    return NextResponse.json({
      success: true,
      data: {
        shadowWritten: true,
        mode: liveEnabled ? "live" : "shadow",
        matchedDealId: draft.matchedDealId,
        matchedContactId: draft.matchedContactId,
      },
    })
  } catch (e) {
    console.error("Meeting recap webhook error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
