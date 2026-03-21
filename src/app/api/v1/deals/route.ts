import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createDealSchema = z.object({
  name: z.string().min(1).max(200),
  companyId: z.string().optional(),
  campaignId: z.string().optional(),
  stage: z.string().optional(),
  valueAmount: z.number().min(0).optional(),
  currency: z.string().max(5).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().max(5000).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const stage = searchParams.get("stage") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const where = {
      organizationId: orgId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(stage ? { stage } : {}),
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
        },
      }),
      prisma.deal.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { deals, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { deals: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createDealSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const deal = await prisma.deal.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        companyId: parsed.data.companyId || null,
        campaignId: parsed.data.campaignId || null,
        stage: parsed.data.stage || "LEAD",
        valueAmount: parsed.data.valueAmount || 0,
        currency: parsed.data.currency || "AZN",
        probability: parsed.data.probability || 0,
        expectedClose: parsed.data.expectedClose ? new Date(parsed.data.expectedClose) : null,
        assignedTo: parsed.data.assignedTo,
        notes: parsed.data.notes,
      },
      include: {
        company: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ success: true, data: deal }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
