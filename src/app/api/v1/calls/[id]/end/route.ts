import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { getVoipProvider } from "@/lib/voip"
import type { VoipSettings } from "@/lib/voip"

// POST — end an active call via the configured VoIP provider
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

    // Load VoIP config
    const voipConfig = await prisma.channelConfig.findFirst({
      where: { organizationId: orgId, channelType: "voip", isActive: true },
    })
    if (!voipConfig) {
      return NextResponse.json({ error: "VoIP not configured" }, { status: 400 })
    }

    const settings = voipConfig.settings as unknown as VoipSettings
    const providerName = settings?.provider || "twilio"
    const normalizedSettings: VoipSettings = { ...settings, provider: providerName } as VoipSettings
    const provider = getVoipProvider(normalizedSettings)

    const result = await provider.endCall(callLog.callSid)

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to end call" }, { status: 500 })
    }

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
