import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const itemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().nullable().optional(),
  name: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0).default(0),
  discount: z.number().min(0).max(100).default(0),
  sortOrder: z.number().int().default(0),
})

const updateOfferSchema = z.object({
  type: z.enum(["commercial", "invoice", "equipment", "services"]).optional(),
  title: z.string().optional(),
  companyId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  clientName: z.string().nullable().optional(),
  voen: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  contractNumber: z.string().nullable().optional(),
  includeVat: z.boolean().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected"]).optional(),
  currency: z.string().optional(),
  discount: z.number().optional(),
  validUntil: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(itemSchema).optional(),
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
      include: { items: { orderBy: { sortOrder: "asc" } } },
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
    const { items, validUntil, ...offerData } = parsed.data

    // Update items if provided
    if (items) {
      // Delete old items and create new ones
      await prisma.offerItem.deleteMany({ where: { offerId: id } })
      const itemsWithTotals = items.map((item, idx) => {
        const subtotal = item.quantity * item.unitPrice
        const discountAmount = subtotal * (item.discount / 100)
        return {
          offerId: id,
          productId: item.productId || null,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          total: subtotal - discountAmount,
          sortOrder: item.sortOrder || idx,
        }
      })
      await prisma.offerItem.createMany({ data: itemsWithTotals })
      ;(offerData as any).totalAmount = itemsWithTotals.reduce((s, i) => s + i.total, 0)
    }

    const result = await prisma.offer.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...offerData,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
      },
    })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.offer.findFirst({
      where: { id, organizationId: orgId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    })
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
