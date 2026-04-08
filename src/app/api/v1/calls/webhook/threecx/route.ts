import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/v1/calls/webhook/threecx — receive call events from 3CX
 * Webhook URL: https://app.leaddrivecrm.org/api/v1/calls/webhook/threecx?orgId=xxx&secret=yyy
 */
export async function POST(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get("orgId")
    const secret = req.nextUrl.searchParams.get("secret")

    if (!orgId) {
      return NextResponse.json({ error: "Missing orgId" }, { status: 400 })
    }

    // Validate secret against stored config
    const voipConfig = await prisma.channelConfig.findFirst({
      where: { organizationId: orgId, channelType: "voip", isActive: true },
    })
    if (voipConfig) {
      const settings = voipConfig.settings as any
      if (settings?.webhookSecret && settings.webhookSecret !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await req.json()
    const eventType = body.event || body.type || body.Event || ""
    const callData = body.call || body.data || body

    const callId = String(callData.callId || callData.id || callData.CallId || "")
    const callerNumber = callData.callerNumber || callData.from || callData.CallerNumber || ""
    const calleeNumber = callData.calleeNumber || callData.to || callData.CalleeNumber || ""
    const extension = callData.extension || callData.Extension || ""

    console.log(`[3CX Webhook] Event: ${eventType}, callId: ${callId}, org: ${orgId}`)

    switch (eventType) {
      case "call.ringing":
      case "Ringing": {
        const direction = callData.direction === "outbound" ? "outbound" : "inbound"
        const phoneToMatch = direction === "inbound" ? callerNumber : calleeNumber

        // Try to find matching contact
        let contactId: string | undefined
        if (phoneToMatch) {
          const contact = await prisma.contact.findFirst({
            where: { organizationId: orgId, phone: phoneToMatch },
            select: { id: true },
          })
          contactId = contact?.id
        }

        await prisma.callLog.create({
          data: {
            organizationId: orgId,
            callSid: callId || undefined,
            direction,
            fromNumber: callerNumber,
            toNumber: calleeNumber,
            status: "ringing",
            provider: "threecx",
            contactId,
            startedAt: new Date(),
          },
        })
        break
      }

      case "call.answered":
      case "Answered": {
        if (callId) {
          await prisma.callLog.updateMany({
            where: { organizationId: orgId, callSid: callId },
            data: { status: "in-progress" },
          })
        }
        break
      }

      case "call.ended":
      case "Ended":
      case "call.completed": {
        const duration = parseInt(callData.duration || callData.Duration || "0")
        const recordingUrl = callData.recordingUrl || callData.RecordingUrl || null

        if (callId) {
          const existing = await prisma.callLog.findFirst({
            where: { organizationId: orgId, callSid: callId },
          })

          await prisma.callLog.updateMany({
            where: { organizationId: orgId, callSid: callId },
            data: {
              status: "completed",
              duration: duration || undefined,
              recordingUrl,
              endedAt: new Date(),
            },
          })

          // Create Activity record
          if (existing && !existing.activityId) {
            const activity = await prisma.activity.create({
              data: {
                organizationId: orgId,
                type: "call",
                subject: `${existing.direction === "inbound" ? "Inbound" : "Outbound"} call — ${existing.direction === "inbound" ? existing.fromNumber : existing.toNumber}`,
                description: duration ? `Duration: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")}` : undefined,
                contactId: existing.contactId,
                companyId: existing.companyId,
                createdBy: existing.userId,
                completedAt: new Date(),
              },
            })
            await prisma.callLog.updateMany({
              where: { organizationId: orgId, callSid: callId },
              data: { activityId: activity.id },
            })
          }
        }
        break
      }

      case "call.missed":
      case "Missed": {
        if (callId) {
          await prisma.callLog.updateMany({
            where: { organizationId: orgId, callSid: callId },
            data: { status: "no-answer", endedAt: new Date() },
          })
        }
        break
      }

      default:
        console.log(`[3CX Webhook] Unknown event: ${eventType}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[3CX Webhook] Error:", err)
    return NextResponse.json({ ok: true }) // always 200 to 3CX
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", service: "3cx-webhook" })
}
