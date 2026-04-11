import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { PAGE_SIZE } from "@/lib/constants"

// GET — list alerts
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const alerts = await prisma.aiAlert.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE.DEFAULT,
  })

  const unreadCount = await prisma.aiAlert.count({
    where: { organizationId: orgId, isRead: false },
  })

  return NextResponse.json({
    success: true,
    data: { alerts, unreadCount },
  })
}

// POST — mark alerts as read
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { alertIds, markAll } = body

  if (markAll) {
    await prisma.aiAlert.updateMany({
      where: { organizationId: orgId, isRead: false },
      data: { isRead: true },
    })
  } else if (alertIds?.length) {
    await prisma.aiAlert.updateMany({
      where: { organizationId: orgId, id: { in: alertIds } },
      data: { isRead: true },
    })
  }

  return NextResponse.json({ success: true })
}
