import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
