import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const where = {
      organizationId: orgId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    }

    const [journeys, total] = await Promise.all([
      prisma.journey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { steps: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.journey.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { journeys, total, page, limit, search },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { journeys: [], total: 0, page, limit, search },
    })
  }
}
