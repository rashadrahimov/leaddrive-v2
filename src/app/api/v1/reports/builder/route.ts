import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId, getSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const createReportSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  entityType: z.string().min(1).max(100),
  columns: z.any(),
  filters: z.any().default([]),
  groupBy: z.string().max(100).optional().nullable(),
  sortBy: z.string().max(100).optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  chartType: z.string().max(50).default("table"),
  chartConfig: z.any().optional().nullable(),
  isShared: z.boolean().default(false),
  scheduleFreq: z.string().max(50).optional().nullable(),
  scheduleEmails: z.array(z.string().email()).default([]),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")))
  const skip = (page - 1) * limit

  const [reports, total] = await Promise.all([
    prisma.savedReport.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.savedReport.count({ where: { organizationId: orgId } }),
  ])

  return NextResponse.json({
    success: true,
    data: reports,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let data
  try {
    data = createReportSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const report = await prisma.savedReport.create({
    data: {
      organizationId: orgId,
      createdBy: session.userId,
      name: data.name,
      description: data.description ?? null,
      entityType: data.entityType,
      columns: data.columns,
      filters: data.filters,
      groupBy: data.groupBy ?? null,
      sortBy: data.sortBy ?? null,
      sortOrder: data.sortOrder,
      chartType: data.chartType,
      chartConfig: data.chartConfig ?? undefined,
      isShared: data.isShared,
      scheduleFreq: data.scheduleFreq ?? null,
      scheduleEmails: data.scheduleEmails,
    },
  })

  return NextResponse.json({ success: true, data: report }, { status: 201 })
}
