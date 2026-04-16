import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireMobileAuth } from "@/lib/mobile-auth"
import { distanceToPolyline } from "@/lib/geo-utils"

/**
 * POST /api/v1/mtm/mobile/location
 * Submit GPS location from mobile agent.
 * Body: { latitude, longitude, accuracy?, speed?, heading?, altitude?, battery? }
 */
export async function POST(req: NextRequest) {
  const auth = requireMobileAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { latitude, longitude, accuracy, speed, heading, altitude, battery } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "latitude and longitude required" }, { status: 400 })
    }

    // Save location
    await prisma.mtmAgentLocation.create({
      data: {
        organizationId: auth.orgId,
        agentId: auth.agentId,
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: speed || null,
        heading: heading || null,
        altitude: altitude || null,
        battery: battery || null,
        isMoving: (speed || 0) > 1,
      },
    })

    // Update agent online status
    await prisma.mtmAgent.update({
      where: { id: auth.agentId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    // Route deviation detection (non-blocking)
    try {
      const route = await prisma.mtmRoute.findFirst({
        where: { agentId: auth.agentId, organizationId: auth.orgId, status: { in: ["IN_PROGRESS", "PLANNED"] } },
        orderBy: { date: "desc" },
        select: {
          id: true,
          points: {
            orderBy: { orderIndex: "asc" },
            select: { customer: { select: { latitude: true, longitude: true, name: true } } },
          },
        },
      })
      if (route && route.points.length >= 2) {
        const corridor = route.points
          .filter((p: any) => p.customer?.latitude != null && p.customer?.longitude != null)
          .map((p: any) => ({ lat: p.customer.latitude, lng: p.customer.longitude }))

        if (corridor.length >= 2) {
          const deviationMeters = distanceToPolyline(latitude, longitude, corridor)
          const DEVIATION_THRESHOLD = 500 // meters

          if (deviationMeters > DEVIATION_THRESHOLD) {
            // Throttle: check if recent alert exists (last 10 min)
            const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000)
            const recentAlert = await prisma.mtmAlert.findFirst({
              where: {
                agentId: auth.agentId,
                organizationId: auth.orgId,
                type: "OUT_OF_ZONE",
                createdAt: { gte: tenMinAgo },
                isResolved: false,
              },
            })
            if (!recentAlert) {
              await prisma.mtmAlert.create({
                data: {
                  organizationId: auth.orgId,
                  agentId: auth.agentId,
                  type: "OUT_OF_ZONE",
                  category: "WARNING",
                  title: `Route deviation detected`,
                  description: `Agent is ${Math.round(deviationMeters)}m away from planned route (max ${DEVIATION_THRESHOLD}m)`,
                  metadata: {
                    routeId: route.id,
                    deviationMeters: Math.round(deviationMeters),
                    threshold: DEVIATION_THRESHOLD,
                    agentLat: latitude,
                    agentLng: longitude,
                  },
                },
              })
            }
          }
        }
      }
    } catch {} // non-blocking

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save location" }, { status: 500 })
  }
}

/**
 * GET /api/v1/mtm/mobile/location
 * Get agent's own location history for today.
 */
export async function GET(req: NextRequest) {
  const auth = requireMobileAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const locations = await prisma.mtmAgentLocation.findMany({
      where: { agentId: auth.agentId, recordedAt: { gte: today } },
      orderBy: { recordedAt: "asc" },
      take: 500,
    })

    return NextResponse.json({ success: true, data: { locations } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load locations" }, { status: 500 })
  }
}
