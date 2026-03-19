import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createJourneySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  triggerType: z.string().optional(),
  triggerConditions: z.any().optional(),
})

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

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createJourneySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const journey = await prisma.journey.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: journey }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
