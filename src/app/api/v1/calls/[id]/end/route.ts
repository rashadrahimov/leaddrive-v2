import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// POST — end an active Twilio call
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const callLog = await prisma.callLog.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!callLog || !callLog.callSid) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 })
    }

    // Load VoIP config for Twilio credentials
    const voipConfig = await prisma.channelConfig.findFirst({
      where: { organizationId: orgId, channelType: "voip", isActive: true },
    })
    if (!voipConfig) {
      return NextResponse.json({ error: "VoIP not configured" }, { status: 400 })
    }

    const settings = voipConfig.settings as any

    // End call via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${settings.accountSid}/Calls/${callLog.callSid}.json`
    const twilioAuth = Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString("base64")

    await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ Status: "completed" }).toString(),
    })

    await prisma.callLog.update({
      where: { id },
      data: { status: "completed", endedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("End call error:", e)
    return NextResponse.json({ error: "Failed to end call" }, { status: 500 })
  }
}
