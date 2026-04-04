import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const resolved = searchParams.get("resolved")
  const type = searchParams.get("type") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (resolved !== null && resolved !== "") where.isResolved = resolved === "true"
    if (type) where.type = type

    const [alerts, total] = await Promise.all([
      prisma.mtmAlert.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { agent: { select: { id: true, name: true } } },
      }),
      prisma.mtmAlert.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { alerts, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { alerts: [], total: 0, page, limit } })
  }
}
