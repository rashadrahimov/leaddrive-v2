import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMobileAuth } from "@/lib/mobile-auth"

/**
 * GET /api/v1/mtm/mobile/ping
 * Public endpoint — no auth required.
 * Returns server name for mobile app server discovery.
 */
export async function GET() {
  try {
    // Get first active organization name for branding
    const org = await prisma.organization.findFirst({
      select: { name: true },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        name: org?.name || "LeadDrive CRM",
        version: "2.0",
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        name: "LeadDrive CRM",
        version: "2.0",
      },
    })
  }
}

/**
 * POST /api/v1/mtm/mobile/ping
 * Heartbeat — keeps agent online status updated.
 * Called every 60s from mobile app while logged in.
 */
export async function POST(req: NextRequest) {
  const auth = requireMobileAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    await prisma.mtmAgent.update({
      where: { id: auth.agentId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}
