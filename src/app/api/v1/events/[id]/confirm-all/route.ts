import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  const result = await prisma.eventParticipant.updateMany({
    where: { eventId: id, status: { not: "confirmed" } },
    data: { status: "confirmed" },
  })

  return NextResponse.json({
    success: true,
    data: { confirmed: result.count },
  })
}
