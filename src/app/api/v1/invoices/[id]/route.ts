import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { calculateItemTotal, calculateInvoiceTotals, calculateBalance } from "@/lib/invoice-calculations"

const itemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0.01).default(1),
  unitPrice: z.number().min(0).default(0),
  discount: z.number().min(0).max(100).default(0),
  taxRate: z.number().optional().nullable(),
  sortOrder: z.number().int().default(0),
})

const updateSchema = z.object({
  title: z.string().optional(),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  status: z.string().optional(),
  currency: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  discountValue: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  includeVat: z.boolean().optional(),
  voen: z.string().optional().nullable(),
  sellerVoen: z.string().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  paymentTerms: z.string().optional(),
  paymentTermsDays: z.number().optional().nullable(),
  recipientEmail: z.string().optional().nullable(),
  recipientName: z.string().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  footerNote: z.string().optional().nullable(),
  signerName: z.string().optional().nullable(),
  signerTitle: z.string().optional().nullable(),
  contractNumber: z.string().optional().nullable(),
  contractDate: z.string().optional().nullable(),
  documentLanguage: z.string().optional(),
  items: z.array(itemSchema).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        payments: { where: { organizationId: orgId }, orderBy: { paymentDate: "desc" } },
        company: { select: { id: true, name: true, address: true, email: true, phone: true } },
        contact: { select: { id: true, fullName: true, email: true, phone: true } },
        deal: { select: { id: true, name: true } },
        contract: { select: { id: true, title: true, contractNumber: true } },
      },
    })

    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: invoice })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const existing = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: { payments: { where: { organizationId: orgId } } },
    })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Prevent modifying paid invoices (only status change allowed)
    if (existing.status === "paid" && parsed.data.status !== "paid") {
      return NextResponse.json({ error: "Cannot modify a paid invoice" }, { status: 400 })
    }

    const d = parsed.data
    const { items, issueDate, dueDate, ...rest } = d

    const updateData: Record<string, unknown> = { ...rest }
    if (issueDate) updateData.issueDate = new Date(issueDate)
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null

    if (items) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
      const itemsData = items.map((item, idx) => ({
        invoiceId: id,
        productId: item.productId || undefined,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        total: calculateItemTotal(item),
        sortOrder: item.sortOrder || idx,
      }))
      await prisma.invoiceItem.createMany({ data: itemsData })

      const discountType = (d.discountType || existing.discountType) as "percentage" | "fixed"
      const discountValue = d.discountValue ?? existing.discountValue
      const taxRate = d.taxRate ?? existing.taxRate
      const includeVat = d.includeVat ?? existing.includeVat

      const totals = calculateInvoiceTotals(items, discountType, discountValue, taxRate, includeVat)
      updateData.subtotal = totals.subtotal
      updateData.discountAmount = totals.discountAmount
      updateData.taxAmount = totals.taxAmount
      updateData.totalAmount = totals.totalAmount
      updateData.balanceDue = calculateBalance(totals.totalAmount, existing.paidAmount)
    }

    await prisma.invoice.updateMany({
      where: { id, organizationId: orgId },
      data: updateData,
    })
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        company: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: invoice })
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
    await prisma.invoice.deleteMany({ where: { id, organizationId: orgId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
