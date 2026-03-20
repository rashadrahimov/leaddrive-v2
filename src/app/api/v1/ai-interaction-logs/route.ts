import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// GET — list interaction logs with pagination
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    prisma.aiInteractionLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.aiInteractionLog.count({ where: { organizationId: orgId } }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
  })
}
