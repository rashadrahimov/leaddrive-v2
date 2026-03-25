import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const platform = searchParams.get("platform") || ""
  const status = searchParams.get("status") || "open"
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  const where: any = { organizationId: orgId }
  if (platform) where.platform = platform
  if (status !== "all") where.status = status

  const [conversations, total] = await Promise.all([
    prisma.socialConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.socialConversation.count({ where }),
  ])

  return NextResponse.json({ success: true, data: { conversations, total, page, limit } })
}
