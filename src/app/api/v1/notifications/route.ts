import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await auth()
  const userId = (session?.user as any)?.id

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        organizationId: orgId,
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: {
        organizationId: orgId,
        ...(userId ? { userId } : {}),
        isRead: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: { notifications, unreadCount },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { notifications: [], unreadCount: 0 },
    })
  }
}

export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { ids, markAll } = body

  try {
    if (markAll) {
      const session = await auth()
      const userId = (session?.user as any)?.id
      await prisma.notification.updateMany({
        where: {
          organizationId: orgId,
          ...(userId ? { userId } : {}),
          isRead: false,
        },
        data: { isRead: true },
      })
    } else if (ids && Array.isArray(ids)) {
      await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          organizationId: orgId,
        },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
