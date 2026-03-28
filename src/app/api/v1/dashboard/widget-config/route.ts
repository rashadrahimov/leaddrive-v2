import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const ALL_ROLES = ["admin", "manager", "sales", "support", "viewer", "marketing", "finance", "hr"]

const DEFAULT_WIDGETS: Record<string, { enabled: boolean; roles: string[] }> = {
  // Row 0: KPI cards
  statCards: { enabled: true, roles: [...ALL_ROLES] },
  // Row 1: Pipeline + Revenue + Lead Sources
  dealPipeline: { enabled: true, roles: [...ALL_ROLES] },
  revenueTrend: { enabled: true, roles: [...ALL_ROLES] },
  leadSources: { enabled: true, roles: [...ALL_ROLES] },
  // Row 2: Deals + AI Scoring + Activity
  recentDeals: { enabled: true, roles: [...ALL_ROLES] },
  aiLeadScoring: { enabled: true, roles: [...ALL_ROLES] },
  activityFeed: { enabled: true, roles: [...ALL_ROLES] },
  // Row 3: Campaigns + Events + Weekly
  campaignStats: { enabled: true, roles: [...ALL_ROLES] },
  upcomingEvents: { enabled: true, roles: [...ALL_ROLES] },
  weeklyMetrics: { enabled: true, roles: [...ALL_ROLES] },
  // Extra: available but off by default
  revenueChart: { enabled: false, roles: [...ALL_ROLES] },
  forecast: { enabled: false, roles: [...ALL_ROLES] },
  clientHealth: { enabled: false, roles: [...ALL_ROLES] },
  taskSummary: { enabled: false, roles: [...ALL_ROLES] },
  ticketSummary: { enabled: false, roles: [...ALL_ROLES] },
  leadFunnel: { enabled: false, roles: [...ALL_ROLES] },
  // New additional widgets
  invoiceStats: { enabled: false, roles: [...ALL_ROLES] },
  campaignRoi: { enabled: false, roles: [...ALL_ROLES] },
  dealConversion: { enabled: false, roles: [...ALL_ROLES] },
  ticketSla: { enabled: false, roles: [...ALL_ROLES] },
  leadFunnelDetailed: { enabled: false, roles: [...ALL_ROLES] },
  revenueByClient: { enabled: false, roles: [...ALL_ROLES] },
  profitMargin: { enabled: false, roles: [...ALL_ROLES] },
  taskCompletion: { enabled: false, roles: [...ALL_ROLES] },
  overdueInvoices: { enabled: false, roles: [...ALL_ROLES] },
  teamPerformance: { enabled: false, roles: [...ALL_ROLES] },
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
    console.error("Widget config GET error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }
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
    console.error("Widget config PUT error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
