import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const recurring = await prisma.recurringInvoice.findFirst({
      where: { id, organizationId: orgId },
      include: { items: true, invoices: { where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 20 } },
    })
    if (!recurring) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: recurring })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const existing = await prisma.recurringInvoice.findFirst({ where: { id, organizationId: orgId } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const body = await req.json()
    const { items, startDate, endDate, ...rest } = body

    const updateData: Record<string, unknown> = { ...rest }
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null

    if (items) {
      await prisma.recurringInvoiceItem.deleteMany({ where: { recurringInvoiceId: id } })
      await prisma.recurringInvoiceItem.createMany({
        data: items.map((item: Record<string, unknown>, idx: number) => ({
          recurringInvoiceId: id,
          productId: item.productId || undefined,
          name: item.name as string,
          description: item.description as string | undefined,
          quantity: (item.quantity as number) || 1,
          unitPrice: (item.unitPrice as number) || 0,
          discount: (item.discount as number) || 0,
          sortOrder: (item.sortOrder as number) || idx,
        })),
      })
    }

    const recurring = await prisma.recurringInvoice.update({
      where: { id },
      data: updateData,
      include: { items: true },
    })

    return NextResponse.json({ success: true, data: recurring })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    await prisma.recurringInvoice.deleteMany({ where: { id, organizationId: orgId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
