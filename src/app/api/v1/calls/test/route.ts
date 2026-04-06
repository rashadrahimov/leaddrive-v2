import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { getVoipProvider } from "@/lib/voip"
import type { VoipSettings } from "@/lib/voip"

// POST — test VoIP provider connection
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Load VoIP config
    const voipConfig = await prisma.channelConfig.findFirst({
      where: { organizationId: orgId, channelType: "voip", isActive: true },
    })
    if (!voipConfig) {
      return NextResponse.json({ error: "VoIP not configured. Save your settings first." }, { status: 400 })
    }

    const settings = voipConfig.settings as unknown as VoipSettings
    const providerName = settings?.provider || "twilio"
    const normalizedSettings: VoipSettings = { ...settings, provider: providerName } as VoipSettings
    const provider = getVoipProvider(normalizedSettings)

    const result = await provider.testConnection()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      provider: providerName,
    })
  } catch (e) {
    console.error("VoIP test error:", e)
    return NextResponse.json({ error: "Test failed: internal error" }, { status: 500 })
  }
}
