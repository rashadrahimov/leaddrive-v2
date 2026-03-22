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
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const deal = await prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: {
        company: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    })

    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: deal })
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
      },
    })

    if (deal.count === 0) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    const updated = await prisma.deal.findFirst({
      where: { id, organizationId: orgId },
      include: {
        company: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
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
