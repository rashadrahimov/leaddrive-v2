import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "50", 10)
  const [changes, total] = await Promise.all([
    prisma.priceChange.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.priceChange.count({ where: { organizationId: orgId } }),
  ])
  return NextResponse.json({ success: true, data: { changes, total, page, limit } })
}
