import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const ALL_ROLES = ["admin", "manager", "sales", "support", "viewer", "marketing", "finance", "hr"]

const DEFAULT_WIDGETS: Record<string, { enabled: boolean; roles: string[] }> = {
  statCards: { enabled: true, roles: [...ALL_ROLES] },
  revenueChart: { enabled: true, roles: [...ALL_ROLES] },
  dealPipeline: { enabled: true, roles: [...ALL_ROLES] },
  forecast: { enabled: true, roles: [...ALL_ROLES] },
  clientHealth: { enabled: true, roles: [...ALL_ROLES] },
  activityFeed: { enabled: true, roles: [...ALL_ROLES] },
  taskSummary: { enabled: true, roles: [...ALL_ROLES] },
  ticketSummary: { enabled: true, roles: [...ALL_ROLES] },
  leadFunnel: { enabled: true, roles: [...ALL_ROLES] },
  leadSources: { enabled: true, roles: [...ALL_ROLES] },
  revenueTrend: { enabled: true, roles: [...ALL_ROLES] },
  recentDeals: { enabled: true, roles: [...ALL_ROLES] },
  aiLeadScoring: { enabled: true, roles: [...ALL_ROLES] },
  campaignStats: { enabled: true, roles: [...ALL_ROLES] },
  upcomingEvents: { enabled: true, roles: [...ALL_ROLES] },
  weeklyMetrics: { enabled: true, roles: [...ALL_ROLES] },
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const org = await prisma.organization.findFirst({
      where: { id: orgId },
      select: { settings: true },
    })

    const settings = (org?.settings as any) || {}
    const widgets = { ...DEFAULT_WIDGETS, ...settings.dashboardWidgets }

    // Get unique roles from users in this org
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: { role: true },
      distinct: ["role"],
    })
    const orgRoles = [...new Set(users.map((u: any) => u.role).filter(Boolean))]

    return NextResponse.json({
      success: true,
      data: { widgets, roles: orgRoles.length > 0 ? orgRoles : ALL_ROLES },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { widgets } = body

    if (!widgets || typeof widgets !== "object") {
      return NextResponse.json({ error: "Invalid widgets config" }, { status: 400 })
    }

    // Get current settings and merge
    const org = await prisma.organization.findFirst({
      where: { id: orgId },
      select: { settings: true },
    })
    const currentSettings = (org?.settings as any) || {}

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          dashboardWidgets: widgets,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
