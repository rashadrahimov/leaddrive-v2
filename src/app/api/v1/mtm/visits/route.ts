import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { calculateDistance } from "@/lib/geo-utils"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""
  const customerId = searchParams.get("customerId") || ""
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (agentId) where.agentId = agentId
    if (customerId) where.customerId = customerId
    if (from || to) {
      where.checkInAt = {}
      if (from) where.checkInAt.gte = new Date(from)
      if (to) where.checkInAt.lte = new Date(to)
    }

    const [visits, total] = await Promise.all([
      prisma.mtmVisit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { checkInAt: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, address: true, latitude: true, longitude: true } },
        },
      }),
      prisma.mtmVisit.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { visits, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { visits: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { agentId, customerId, notes, force } = body
    const latitude = body.latitude != null ? parseFloat(body.latitude) : null
    const longitude = body.longitude != null ? parseFloat(body.longitude) : null

    // Geofence validation when agent provides GPS coordinates
    if (latitude != null && longitude != null && customerId) {
      // Fetch customer coordinates and geofence radius in parallel
      const [customer, settingRow] = await Promise.all([
        prisma.mtmCustomer.findFirst({
          where: { id: customerId, organizationId: orgId },
          select: { id: true, name: true, latitude: true, longitude: true },
        }),
        prisma.mtmSetting.findFirst({
          where: { organizationId: orgId, key: "geofenceRadius" },
          select: { value: true },
        }),
      ])

      if (customer?.latitude != null && customer?.longitude != null) {
        const geofenceRadius =
          settingRow?.value != null ? Number(settingRow.value) : 100

        const distanceMeters = calculateDistance(
          latitude,
          longitude,
          customer.latitude,
          customer.longitude
        )

        if (distanceMeters > geofenceRadius) {
          // Create an OUT_OF_ZONE alert regardless of force flag
          if (agentId) {
            await prisma.mtmAlert.create({
              data: {
                organizationId: orgId,
                agentId,
                type: "OUT_OF_ZONE",
                category: "WARNING",
                title: `Geofence violation at ${customer.name}`,
                description: `Agent checked in ${Math.round(distanceMeters)}m away (max ${geofenceRadius}m)`,
                metadata: {
                  customerId,
                  distanceMeters: Math.round(distanceMeters),
                  geofenceRadius,
                  agentLat: latitude,
                  agentLng: longitude,
                  customerLat: customer.latitude,
                  customerLng: customer.longitude,
                },
              },
            }).catch(() => {}) // non-blocking — don't fail the whole request
          }

          // Block unless force override
          if (!force) {
            return NextResponse.json(
              {
                error: `Too far from customer (${Math.round(distanceMeters)}m away, max ${geofenceRadius}m)`,
                distanceMeters: Math.round(distanceMeters),
                geofenceRadius,
              },
              { status: 400 }
            )
          }
        }
      }
    }

    const visit = await prisma.mtmVisit.create({
      data: {
        organizationId: orgId,
        agentId,
        customerId,
        checkInLat: latitude,
        checkInLng: longitude,
        notes: notes || null,
      },
    })

    // Auto-update route point: mark as VISITED + update route counters
    if (agentId && customerId) {
      try {
        // Find the most recent active route point for this agent+customer
        // Look for routes that are PLANNED or IN_PROGRESS (not just today's date)
        const routePoint = await prisma.mtmRoutePoint.findFirst({
          where: {
            customerId,
            status: "PENDING",
            route: { agentId, organizationId: orgId, status: { in: ["PLANNED", "IN_PROGRESS"] } },
          },
          orderBy: { route: { date: "desc" } },
          select: { id: true, routeId: true },
        })

        if (routePoint) {
          // Mark point as VISITED
          await prisma.mtmRoutePoint.update({
            where: { id: routePoint.id },
            data: { status: "VISITED", visitedAt: new Date() },
          })

          // Update route counters
          const route = await prisma.mtmRoute.findUnique({
            where: { id: routePoint.routeId },
            select: { id: true, totalPoints: true, status: true },
          })
          if (route) {
            const visitedCount = await prisma.mtmRoutePoint.count({
              where: { routeId: route.id, status: "VISITED" },
            })
            await prisma.mtmRoute.update({
              where: { id: route.id },
              data: {
                visitedPoints: visitedCount,
                status: visitedCount >= route.totalPoints ? "COMPLETED" : route.status === "PLANNED" ? "IN_PROGRESS" : route.status,
                startedAt: route.status === "PLANNED" ? new Date() : undefined,
                completedAt: visitedCount >= route.totalPoints ? new Date() : undefined,
              },
            })
          }
        }
      } catch {} // non-blocking — visit already created
    }

    return NextResponse.json({ success: true, data: visit }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create visit" }, { status: 400 })
  }
}
