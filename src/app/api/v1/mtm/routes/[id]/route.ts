import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { calculateDistance } from "@/lib/geo-utils"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const agentLat = searchParams.get("latitude") ? parseFloat(searchParams.get("latitude")!) : null
  const agentLng = searchParams.get("longitude") ? parseFloat(searchParams.get("longitude")!) : null

  try {
    const route = await prisma.mtmRoute.findFirst({
      where: { id, organizationId: orgId },
      include: {
        agent: { select: { id: true, name: true } },
        points: { include: { customer: { select: { id: true, name: true, address: true, city: true, phone: true, latitude: true, longitude: true } } }, orderBy: { orderIndex: "asc" } },
      },
    })
    if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Annotate each point with distanceMeters if agent position provided
    const points = route.points.map((point: (typeof route.points)[number]) => {
      if (
        agentLat != null &&
        agentLng != null &&
        point.customer.latitude != null &&
        point.customer.longitude != null
      ) {
        return {
          ...point,
          distanceMeters: Math.round(
            calculateDistance(agentLat, agentLng, point.customer.latitude, point.customer.longitude)
          ),
        }
      }
      return { ...point, distanceMeters: null }
    })

    return NextResponse.json({ success: true, data: { ...route, points } })
  } catch {
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()

    // Update route
    const updated = await prisma.mtmRoute.updateMany({
      where: { id, organizationId: orgId },
      data: {
        name: body.name || null,
        agentId: body.agentId,
        date: new Date(body.date),
        status: body.status || "PLANNED",
        notes: body.notes || null,
        totalPoints: body.points?.length || 0,
      },
    })
    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Replace points if provided
    if (body.points) {
      await prisma.mtmRoutePoint.deleteMany({ where: { routeId: id, route: { organizationId: orgId } } })
      if (body.points.length > 0) {
        await prisma.mtmRoutePoint.createMany({
          data: body.points.map((p: any, i: number) => ({
            routeId: id,
            customerId: p.customerId,
            orderIndex: i,
          })),
        })
      }
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
    await prisma.mtmRoutePoint.deleteMany({ where: { routeId: id, route: { organizationId: orgId } } })
    const deleted = await prisma.mtmRoute.deleteMany({ where: { id, organizationId: orgId } })
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete" }, { status: 400 })
  }
}
