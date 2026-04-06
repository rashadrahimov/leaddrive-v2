import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { trackContactEvent } from "@/lib/contact-events"

// POST — Twilio status callback (public endpoint, no auth required)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const callSid = formData.get("CallSid") as string
    const status = formData.get("CallStatus") as string
    const duration = formData.get("CallDuration") as string | null
    const recordingUrl = formData.get("RecordingUrl") as string | null

    if (!callSid) {
      return new Response("Missing CallSid", { status: 400 })
    }

    const callLog = await prisma.callLog.findUnique({ where: { callSid } })
    if (!callLog) {
      return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } })
    }

    const updateData: any = { status }
    if (duration) updateData.duration = parseInt(duration)
    if (recordingUrl) updateData.recordingUrl = recordingUrl

    const terminalStatuses = ["completed", "busy", "no-answer", "failed", "canceled"]
    if (terminalStatuses.includes(status)) {
      updateData.endedAt = new Date()

      // Auto-create Activity record
      try {
        const activity = await prisma.activity.create({
          data: {
            organizationId: callLog.organizationId,
            type: "call",
            subject: `${callLog.direction === "outbound" ? "Outbound" : "Inbound"} call (${duration || 0}s)`,
            description: `Call to ${callLog.toNumber}. Status: ${status}. Duration: ${duration || 0}s`,
            contactId: callLog.contactId,
            companyId: callLog.companyId,
            createdBy: callLog.userId,
            completedAt: new Date(),
          },
        })
        updateData.activityId = activity.id
      } catch { /* ignore activity creation errors */ }

      // Track contact event
      if (callLog.contactId) {
        trackContactEvent(callLog.organizationId, callLog.contactId, "call_logged", {
          direction: callLog.direction,
          duration: duration ? parseInt(duration) : 0,
          status,
        }).catch(() => {})
      }
    }

    await prisma.callLog.update({ where: { callSid }, data: updateData })

    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } })
  } catch (e) {
    console.error("Call webhook error:", e)
    return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } })
  }
}
