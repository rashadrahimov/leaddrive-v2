import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""
  const visitId = searchParams.get("visitId") || ""
  const status = searchParams.get("status") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (agentId) where.agentId = agentId
    if (visitId) where.visitId = visitId
    if (status) where.status = status

    const [photos, total] = await Promise.all([
      prisma.mtmPhoto.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          visit: { select: { id: true, customer: { select: { name: true } } } },
        },
      }),
      prisma.mtmPhoto.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { photos, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { photos: [], total: 0, page, limit } })
  }
}
