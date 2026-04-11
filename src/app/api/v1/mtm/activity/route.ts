import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "" // CHECK_IN, CHECK_OUT, PHOTO, TASK
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // KPI counts for today
    const [totalCheckIns, totalCheckOuts, totalPhotos, totalActivities] = await Promise.all([
      prisma.mtmVisit.count({ where: { organizationId: orgId, status: "CHECKED_IN", createdAt: { gte: today } } }),
      prisma.mtmVisit.count({ where: { organizationId: orgId, status: "CHECKED_OUT", createdAt: { gte: today } } }),
      prisma.mtmPhoto.count({ where: { organizationId: orgId, createdAt: { gte: today } } }),
      prisma.mtmAuditLog.count({ where: { organizationId: orgId, createdAt: { gte: today } } }),
    ])

    // Build activity feed from audit logs + visits + photos
    const auditWhere: any = { organizationId: orgId }
    if (type === "CHECK_IN") auditWhere.action = "VISIT_CHECK_IN"
    else if (type === "CHECK_OUT") auditWhere.action = "VISIT_CHECK_OUT"
    else if (type === "PHOTO") auditWhere.action = "PHOTO_UPLOAD"

    const [logs, total] = await Promise.all([
      prisma.mtmAuditLog.findMany({
        where: auditWhere,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        // MtmAuditLog has agentId but no relation — fetch agent names separately
      }),
      prisma.mtmAuditLog.count({ where: auditWhere }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        kpi: { totalActivities, totalCheckIns, totalCheckOuts, totalPhotos },
        logs,
        total,
        page,
        limit,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to fetch activity" }, { status: 500 })
  }
}
