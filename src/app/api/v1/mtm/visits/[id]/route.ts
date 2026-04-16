import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { writeMtmAudit } from "@/lib/mtm-audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const visit = await prisma.mtmVisit.findFirst({
      where: { id, organizationId: orgId },
      include: {
        agent: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    })
    if (!visit) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: visit })
  } catch {
    return NextResponse.json({ error: "Failed to fetch visit" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const data: any = {}
    if (body.agentId) data.agentId = body.agentId
    if (body.customerId) data.customerId = body.customerId
    if (body.notes !== undefined) data.notes = body.notes || null
    if (body.status) data.status = body.status

    // Handle check-out: save checkout GPS + auto-set checkOutAt + calculate duration
    if (body.status === "CHECKED_OUT") {
      if (!body.checkOutAt) data.checkOutAt = new Date()
      // Save checkout GPS to checkOutLat/Lng (NOT checkInLat/Lng)
      if (body.latitude != null) data.checkOutLat = parseFloat(body.latitude)
      if (body.longitude != null) data.checkOutLng = parseFloat(body.longitude)

      // Calculate visit duration in minutes
      const visit = await prisma.mtmVisit.findFirst({
        where: { id, organizationId: orgId },
        select: { checkInAt: true },
      })
      if (visit?.checkInAt) {
        const checkOut = data.checkOutAt || new Date()
        data.duration = Math.round((checkOut.getTime() - visit.checkInAt.getTime()) / 60000)
      }
    } else {
      // Non-checkout update: lat/lng goes to checkInLat/Lng
      if (body.latitude != null) data.checkInLat = parseFloat(body.latitude)
      if (body.longitude != null) data.checkInLng = parseFloat(body.longitude)
    }

    const updated = await prisma.mtmVisit.updateMany({
      where: { id, organizationId: orgId },
      data,
    })
    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Audit log for check-out — non-blocking
    if (body.status === "CHECKED_OUT" && body.agentId) {
      writeMtmAudit({
        organizationId: orgId,
        agentId: body.agentId,
        action: "CHECK_OUT",
        entity: "visit",
        entityId: id,
        newData: { duration: data.duration, latitude: body.latitude, longitude: body.longitude },
        req,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update" }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const deleted = await prisma.mtmVisit.deleteMany({ where: { id, organizationId: orgId } })
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete" }, { status: 400 })
  }
}
