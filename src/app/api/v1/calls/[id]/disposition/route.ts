import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

/**
 * PATCH /api/v1/calls/[id]/disposition — set call disposition after call ends
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { disposition } = await req.json()

  const validDispositions = [
    "interested", "not_interested", "callback", "voicemail",
    "wrong_number", "no_answer", "other",
  ]
  if (!validDispositions.includes(disposition)) {
    return NextResponse.json({ error: "Invalid disposition" }, { status: 400 })
  }

  try {
    await prisma.callLog.updateMany({
      where: { id, organizationId: orgId },
      data: { disposition },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Disposition error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
