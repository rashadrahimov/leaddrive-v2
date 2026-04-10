import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""

  try {
    // Single agent history (for replay)
    if (agentId) {
      const locations = await prisma.mtmAgentLocation.findMany({
        where: { organizationId: orgId, agentId },
        take: 200,
        orderBy: { recordedAt: "desc" },
      })
      return NextResponse.json({ success: true, data: { locations } })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)

    // Get agents with latest location + today's route completion
    const agents = await prisma.mtmAgent.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        isOnline: true,
        lastSeenAt: true,
        locations: { take: 1, orderBy: { recordedAt: "desc" } },
      },
    })

    // Get today's route completion per agent
    const todayRoutes = await prisma.mtmRoute.findMany({
      where: { organizationId: orgId, date: { gte: today } },
      select: { agentId: true, totalPoints: true, visitedPoints: true, status: true },
    })
    const routeMap = Object.fromEntries(
      todayRoutes.map((r) => [r.agentId, {
        completion: r.totalPoints > 0 ? Math.round((r.visitedPoints / r.totalPoints) * 100) : 0,
        routeStatus: r.status,
      }])
    )

    // Get today's active visits (checked in but not out) for check-in status
    const activeVisits = await prisma.mtmVisit.findMany({
      where: { organizationId: orgId, status: "CHECKED_IN", checkInAt: { gte: today } },
      select: { agentId: true },
    })
    const checkedInAgents = new Set(activeVisits.map((v) => v.agentId))

    // Determine field status per agent
    const agentLocations = agents.map((a: any) => {
      const loc = a.locations[0] || null
      const route = routeMap[a.id]
      const isCheckedIn = checkedInAgents.has(a.id)

      // Determine field status
      let fieldStatus: string
      if (!a.isOnline || !a.lastSeenAt || a.lastSeenAt < fiveMinAgo) {
        fieldStatus = "OFFLINE"
      } else if (isCheckedIn) {
        fieldStatus = "CHECKED_IN"
      } else if (route?.routeStatus === "IN_PROGRESS" && loc?.isMoving) {
        fieldStatus = "ON_ROAD"
      } else if (route?.routeStatus === "PLANNED" && a.isOnline) {
        // Has route but hasn't started — check if late (after 09:00 and route not started)
        const now = new Date()
        const hour = now.getHours()
        fieldStatus = hour >= 10 ? "LATE" : "ON_ROAD"
      } else if (a.isOnline) {
        fieldStatus = "ON_ROAD"
      } else {
        fieldStatus = "OFFLINE"
      }

      return {
        agentId: a.id,
        name: a.name,
        isOnline: a.isOnline,
        lastSeenAt: a.lastSeenAt,
        fieldStatus,
        routeCompletion: route?.completion ?? 0,
        ...(loc ? {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          speed: loc.speed,
          heading: loc.heading,
          battery: loc.battery,
          isMoving: loc.isMoving,
          recordedAt: loc.recordedAt,
        } : {}),
      }
    })

    // Status counts
    const statusCounts = {
      total: agentLocations.length,
      checkedIn: agentLocations.filter((a) => a.fieldStatus === "CHECKED_IN").length,
      onRoad: agentLocations.filter((a) => a.fieldStatus === "ON_ROAD").length,
      late: agentLocations.filter((a) => a.fieldStatus === "LATE").length,
      offline: agentLocations.filter((a) => a.fieldStatus === "OFFLINE").length,
    }

    // Recent events for live feed (last 10 visits/check-ins today)
    const recentEvents = await prisma.mtmVisit.findMany({
      where: { organizationId: orgId, checkInAt: { gte: today } },
      take: 10,
      orderBy: { checkInAt: "desc" },
      include: {
        agent: { select: { name: true } },
        customer: { select: { name: true } },
      },
    })

    const liveFeed = recentEvents.map((v: any) => ({
      id: v.id,
      type: v.status === "CHECKED_IN" ? "CHECK_IN" : "CHECK_OUT",
      agent: v.agent.name,
      customer: v.customer.name,
      time: v.status === "CHECKED_IN" ? v.checkInAt : v.checkOutAt || v.checkInAt,
    }))

    return NextResponse.json({
      success: true,
      data: { agentLocations, statusCounts, liveFeed },
    })
  } catch {
    return NextResponse.json({ success: true, data: { agentLocations: [], statusCounts: { total: 0, checkedIn: 0, onRoad: 0, late: 0, offline: 0 }, liveFeed: [] } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const location = await prisma.mtmAgentLocation.create({
      data: {
        organizationId: orgId,
        agentId: body.agentId,
        latitude: parseFloat(body.latitude),
        longitude: parseFloat(body.longitude),
        accuracy: body.accuracy ? parseFloat(body.accuracy) : null,
        speed: body.speed ? parseFloat(body.speed) : null,
        heading: body.heading ? parseFloat(body.heading) : null,
        battery: body.battery ? parseFloat(body.battery) : null,
        isMoving: body.isMoving || false,
      },
    })

    await prisma.mtmAgent.update({
      where: { id: body.agentId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    return NextResponse.json({ success: true, data: location }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save location" }, { status: 400 })
  }
}
