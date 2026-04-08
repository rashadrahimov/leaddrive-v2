import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

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
    const data: any = {
      agentId: body.agentId,
      customerId: body.customerId,
      notes: body.notes || null,
    }
    if (body.status) data.status = body.status
    if (body.status === "CHECKED_OUT" && !body.checkOutAt) {
      data.checkOutAt = new Date()
    }
    if (body.latitude) data.checkInLat = parseFloat(body.latitude)
    if (body.longitude) data.checkInLng = parseFloat(body.longitude)

    const updated = await prisma.mtmVisit.updateMany({
      where: { id, organizationId: orgId },
      data,
    })
    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
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
