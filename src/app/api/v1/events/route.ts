import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().default("conference"),
  status: z.string().default("planned"),
  startDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingUrl: z.string().optional(),
  budget: z.number().default(0),
  expectedRevenue: z.number().default(0),
  maxParticipants: z.number().optional(),
  responsibleId: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  const where: any = { organizationId: orgId }
  if (search) where.name = { contains: search, mode: "insensitive" }
  if (status) where.status = status

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: { _count: { select: { participants: true } } },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ])

  return NextResponse.json({ success: true, data: { events, total, page, limit } })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const event = await prisma.event.create({
    data: {
      ...parsed.data,
      organizationId: orgId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    },
  })

  return NextResponse.json({ success: true, data: event }, { status: 201 })
}
