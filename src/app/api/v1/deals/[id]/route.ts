import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateDealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  stage: z.string().optional(),
  valueAmount: z.number().min(0).optional(),
  currency: z.string().max(5).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().nullable().optional(),
  assignedTo: z.string().optional(),
  lostReason: z.string().max(500).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
})

const dealInclude = {
  company: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true } },
  teamMembers: {
    orderBy: { createdAt: "asc" as const },
  },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const deal = await prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: dealInclude,
    })

    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    // Enrich team members with user info
    const userIds = deal.teamMembers.map(m => m.userId)
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, avatar: true, role: true },
        })
      : []
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const enrichedTeam = deal.teamMembers.map(m => ({
      ...m,
      user: userMap[m.userId] || { id: m.userId, name: null, email: "", avatar: null, role: null },
    }))

    return NextResponse.json({ success: true, data: { ...deal, teamMembers: enrichedTeam } })
  } catch {
    return NextResponse.json({ error: "Failed to fetch deal" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateDealSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Auto-set probability when stage changes (if not explicitly provided)
    const STAGE_PROBABILITY: Record<string, number> = {
      LEAD: 10, QUALIFIED: 25, PROPOSAL: 50, NEGOTIATION: 75, WON: 100, LOST: 0,
    }
    if (parsed.data.stage && parsed.data.probability === undefined && STAGE_PROBABILITY[parsed.data.stage] !== undefined) {
      parsed.data.probability = STAGE_PROBABILITY[parsed.data.stage]
    }

    const deal = await prisma.deal.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.companyId !== undefined && { companyId: parsed.data.companyId }),
        ...(parsed.data.campaignId !== undefined && { campaignId: parsed.data.campaignId }),
        ...(parsed.data.stage && { stage: parsed.data.stage }),
        ...(parsed.data.valueAmount !== undefined && { valueAmount: parsed.data.valueAmount }),
        ...(parsed.data.currency && { currency: parsed.data.currency }),
        ...(parsed.data.probability !== undefined && { probability: parsed.data.probability }),
        ...(parsed.data.expectedClose !== undefined && { expectedClose: parsed.data.expectedClose ? new Date(parsed.data.expectedClose) : null }),
        ...(parsed.data.assignedTo && { assignedTo: parsed.data.assignedTo }),
        ...(parsed.data.lostReason && { lostReason: parsed.data.lostReason }),
        ...(parsed.data.notes && { notes: parsed.data.notes }),
        ...(parsed.data.tags !== undefined && { tags: parsed.data.tags }),
      },
    })

    if (deal.count === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    const updated = await prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: dealInclude,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const result = await prisma.deal.deleteMany({
      where: { id, organizationId: orgId },
    })

    if (result.count === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
