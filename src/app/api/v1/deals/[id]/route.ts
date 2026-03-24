import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { executeWorkflows } from "@/lib/workflow-engine"

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
  confidenceLevel: z.number().min(0).max(100).optional(),
  contactId: z.string().nullable().optional(),
  customerNeed: z.string().max(500).optional(),
  salesChannel: z.string().max(100).optional(),
})

const dealInclude = {
  company: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true } },
  teamMembers: true,
  contactRoles: true,
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
    const userIds = deal.teamMembers.map((m: any) => m.userId)
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, avatar: true, role: true },
        })
      : []
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]))

    const enrichedTeam = deal.teamMembers.map((m: any) => ({
      ...m,
      user: userMap[m.userId] || { id: m.userId, name: null, email: "", avatar: null, role: null },
    }))

    // Enrich contact info if contactId exists
    let contact = null
    if (deal.contactId) {
      contact = await prisma.contact.findFirst({
        where: { id: deal.contactId },
        select: { id: true, fullName: true, position: true, email: true, phone: true, avatar: true, companyId: true },
      })
    }

    // Enrich contact roles with contact info
    const roleContactIds = deal.contactRoles.map((r: any) => r.contactId)
    const roleContacts = roleContactIds.length > 0
      ? await prisma.contact.findMany({
          where: { id: { in: roleContactIds } },
          select: { id: true, fullName: true, position: true, email: true, phone: true },
        })
      : []
    const roleContactMap = Object.fromEntries(roleContacts.map((c: any) => [c.id, c]))
    const enrichedRoles = deal.contactRoles.map((r: any) => ({
      ...r,
      contact: roleContactMap[r.contactId] || { id: r.contactId, fullName: "Unknown", position: null, email: null, phone: null },
    }))

    return NextResponse.json({ success: true, data: { ...deal, teamMembers: enrichedTeam, contact, contactRoles: enrichedRoles } })
  } catch (e) {
    console.error("GET deal error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
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

    // Capture old values before update
    const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId }, select: { stage: true, valueAmount: true, assignedTo: true, name: true } })

    const deal = await prisma.deal.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.companyId !== undefined && { companyId: parsed.data.companyId }),
        ...(parsed.data.campaignId !== undefined && { campaignId: parsed.data.campaignId }),
        ...(parsed.data.stage && { stage: parsed.data.stage, stageChangedAt: new Date() }),
        ...(parsed.data.valueAmount !== undefined && { valueAmount: parsed.data.valueAmount }),
        ...(parsed.data.currency && { currency: parsed.data.currency }),
        ...(parsed.data.probability !== undefined && { probability: parsed.data.probability }),
        ...(parsed.data.expectedClose !== undefined && { expectedClose: parsed.data.expectedClose ? new Date(parsed.data.expectedClose) : null }),
        ...(parsed.data.assignedTo && { assignedTo: parsed.data.assignedTo }),
        ...(parsed.data.lostReason && { lostReason: parsed.data.lostReason }),
        ...(parsed.data.notes && { notes: parsed.data.notes }),
        ...(parsed.data.tags !== undefined && { tags: parsed.data.tags }),
        ...(parsed.data.confidenceLevel !== undefined && { confidenceLevel: parsed.data.confidenceLevel }),
        ...(parsed.data.contactId !== undefined && { contactId: parsed.data.contactId }),
        ...(parsed.data.customerNeed && { customerNeed: parsed.data.customerNeed }),
        ...(parsed.data.salesChannel && { salesChannel: parsed.data.salesChannel }),
      },
    })

    if (deal.count === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    const updated = await prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: dealInclude,
    })

    const oldValue: Record<string, any> = {}
    const newValue: Record<string, any> = {}
    if (parsed.data.stage && existing?.stage !== parsed.data.stage) {
      oldValue.stage = existing?.stage
      newValue.stage = parsed.data.stage
    }
    if (parsed.data.valueAmount !== undefined && existing?.valueAmount !== parsed.data.valueAmount) {
      oldValue.valueAmount = existing?.valueAmount
      newValue.valueAmount = parsed.data.valueAmount
    }
    if (parsed.data.assignedTo && existing?.assignedTo !== parsed.data.assignedTo) {
      oldValue.assignedTo = existing?.assignedTo
      newValue.assignedTo = parsed.data.assignedTo
    }
    if (parsed.data.name && existing?.name !== parsed.data.name) {
      oldValue.name = existing?.name
      newValue.name = parsed.data.name
    }
    // fallback: store full patch if no specific fields tracked
    logAudit(orgId, "update", "deal", id, updated?.name || "", {
      oldValue: Object.keys(oldValue).length > 0 ? oldValue : undefined,
      newValue: Object.keys(newValue).length > 0 ? newValue : parsed.data,
    })
    // Trigger workflows for updates
    if (updated) {
      const triggerEvent = parsed.data.stage ? "stage_changed" : "updated"
      executeWorkflows(orgId, "deal", triggerEvent, updated).catch(() => {})
    }

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
    const existing = await prisma.deal.findFirst({ where: { id, organizationId: orgId }, select: { name: true } })
    const result = await prisma.deal.deleteMany({
      where: { id, organizationId: orgId },
    })

    if (result.count === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    logAudit(orgId, "delete", "deal", id, existing?.name || "")
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
