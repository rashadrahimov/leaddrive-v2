import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""

  try {
    // Get latest location for each agent (or specific agent)
    if (agentId) {
      const locations = await prisma.mtmAgentLocation.findMany({
        where: { organizationId: orgId, agentId },
        take: 100,
        orderBy: { recordedAt: "desc" },
      })
      return NextResponse.json({ success: true, data: { locations } })
    }

    // Get latest location per agent for live map
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

    const agentLocations = agents
      .filter((a: any) => a.locations.length > 0)
      .map((a: any) => ({
        agentId: a.id,
        name: a.name,
        isOnline: a.isOnline,
        lastSeenAt: a.lastSeenAt,
        ...a.locations[0],
      }))

    return NextResponse.json({ success: true, data: { agentLocations } })
  } catch {
    return NextResponse.json({ success: true, data: { agentLocations: [] } })
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

    // Update agent's online status
    await prisma.mtmAgent.update({
      where: { id: body.agentId },
      data: { isOnline: true, lastSeenAt: new Date() },
    })

    return NextResponse.json({ success: true, data: location }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to save location" }, { status: 400 })
  }
}
