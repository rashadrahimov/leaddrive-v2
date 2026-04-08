import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

/**
 * GET /api/v1/calls/active — currently ringing/in-progress calls (for incoming call popup polling)
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const activeCalls = await prisma.callLog.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["ringing", "in-progress", "initiated"] },
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      include: {
        contact: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    return NextResponse.json({ success: true, data: activeCalls })
  } catch (e) {
    console.error("Active calls error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
