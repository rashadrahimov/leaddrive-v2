import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession, getOrgId } from "@/lib/api-auth"

// POST — initiate an outbound call via Twilio
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { toNumber, contactId, companyId, dealId } = await req.json()
  if (!toNumber) return NextResponse.json({ error: "toNumber is required" }, { status: 400 })

  try {
    // Load VoIP config
    const voipConfig = await prisma.channelConfig.findFirst({
      where: { organizationId: orgId, channelType: "voip", isActive: true },
    })
    if (!voipConfig) {
      return NextResponse.json({ error: "VoIP not configured. Go to Settings → VoIP to set up." }, { status: 400 })
    }

    const settings = voipConfig.settings as any
    if (!settings?.accountSid || !settings?.authToken || !settings?.twilioNumber) {
      return NextResponse.json({ error: "VoIP credentials incomplete" }, { status: 400 })
    }

    // Create call log entry
    const callLog = await prisma.callLog.create({
      data: {
        organizationId: orgId,
        direction: "outbound",
        fromNumber: settings.twilioNumber,
        toNumber,
        status: "initiated",
        contactId: contactId || null,
        companyId: companyId || null,
        dealId: dealId || null,
        userId: session?.userId || null,
        startedAt: new Date(),
      },
    })

    // Initiate call via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${settings.accountSid}/Calls.json`
    const twilioAuth = Buffer.from(`${settings.accountSid}:${settings.authToken}`).toString("base64")

    const params = new URLSearchParams({
      To: toNumber,
      From: settings.twilioNumber,
      Url: `${process.env.NEXTAUTH_URL}/api/v1/calls/twiml`,
      StatusCallback: `${process.env.NEXTAUTH_URL}/api/v1/calls/webhook`,
      StatusCallbackEvent: "initiated ringing answered completed",
      ...(settings.recordCalls ? { Record: "true" } : {}),
    })

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    })

    const twilioData = await twilioRes.json()

    if (twilioData.sid) {
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { callSid: twilioData.sid },
      })
      return NextResponse.json({ success: true, callLogId: callLog.id, callSid: twilioData.sid })
    } else {
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { status: "failed" },
      })
      return NextResponse.json({ error: twilioData.message || "Failed to initiate call" }, { status: 500 })
    }
  } catch (e) {
    console.error("Call initiation error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET — call history
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get("contactId")
  const companyId = searchParams.get("companyId")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const calls = await prisma.callLog.findMany({
      where: {
        organizationId: orgId,
        ...(contactId ? { contactId } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: {
        contact: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    return NextResponse.json({ success: true, data: calls })
  } catch (e) {
    console.error("Call history error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
