import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession, getOrgId } from "@/lib/api-auth"
import { getVoipProvider } from "@/lib/voip"
import type { VoipSettings } from "@/lib/voip"

// POST — initiate an outbound call via configured VoIP provider
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

    const settings = voipConfig.settings as unknown as VoipSettings
    const providerName = settings?.provider || "twilio"

    // Ensure provider field is set (legacy configs may not have it)
    const normalizedSettings: VoipSettings = { ...settings, provider: providerName } as VoipSettings
    const provider = getVoipProvider(normalizedSettings)

    // Determine fromNumber based on provider
    const fromNumber = (settings as any).twilioNumber
      || (settings as any).callerExtension
      || (settings as any).extension
      || (settings as any).username
      || "unknown"

    // Create call log entry
    const callLog = await prisma.callLog.create({
      data: {
        organizationId: orgId,
        direction: "outbound",
        fromNumber,
        toNumber,
        status: "initiated",
        provider: providerName,
        contactId: contactId || null,
        companyId: companyId || null,
        dealId: dealId || null,
        userId: session?.userId || null,
        startedAt: new Date(),
      },
    })

    // Initiate call via provider adapter
    const result = await provider.initiateCall({
      toNumber,
      fromNumber,
      twimlUrl: `${process.env.NEXTAUTH_URL}/api/v1/calls/twiml`,
      callbackUrl: `${process.env.NEXTAUTH_URL}/api/v1/calls/webhook`,
      record: (settings as any).recordCalls || false,
    })

    if (result.success && result.callSid) {
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { callSid: result.callSid },
      })
      return NextResponse.json({ success: true, callLogId: callLog.id, callSid: result.callSid })
    } else {
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { status: "failed" },
      })
      return NextResponse.json({ error: result.error || "Failed to initiate call" }, { status: 500 })
    }
  } catch (e) {
    console.error("Call initiation error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET — call history with filters and pagination
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const contactId = searchParams.get("contactId")
  const companyId = searchParams.get("companyId")
  const direction = searchParams.get("direction")
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")))

  const where: any = { organizationId: orgId }
  if (contactId) where.contactId = contactId
  if (companyId) where.companyId = companyId
  if (direction) where.direction = direction
  if (status) where.status = status
  if (search) {
    where.OR = [
      { fromNumber: { contains: search, mode: "insensitive" } },
      { toNumber: { contains: search, mode: "insensitive" } },
    ]
  }

  try {
    const [calls, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          contact: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.callLog.count({ where }),
    ])
    return NextResponse.json({
      success: true,
      data: calls,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (e) {
    console.error("Call history error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
