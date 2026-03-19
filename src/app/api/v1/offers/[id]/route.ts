import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateOfferSchema = z.object({
  offerNumber: z.string().optional(),
  title: z.string().optional(),
  companyId: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  totalAmount: z.number().optional(),
  currency: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const offer = await prisma.offer.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: offer })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateOfferSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const result = await prisma.offer.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...parsed.data,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
      },
    })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const updated = await prisma.offer.findFirst({ where: { id, organizationId: orgId } })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const result = await prisma.offer.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
