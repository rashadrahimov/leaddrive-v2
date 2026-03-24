import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { generateInvoiceNumber } from "@/lib/invoice-number"
import { calculateItemTotal, calculateInvoiceTotals, calculateDueDate, calculateBalance } from "@/lib/invoice-calculations"
import crypto from "crypto"

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().min(0.01).default(1),
  unitPrice: z.number().min(0).default(0),
  discount: z.number().min(0).max(100).default(0),
  taxRate: z.number().optional().nullable(),
  sortOrder: z.number().int().default(0),
  customFields: z.record(z.string(), z.string()).optional().nullable(),
})

const createSchema = z.object({
  title: z.string().min(1),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(),
  offerId: z.string().optional().nullable(),
  status: z.string().default("draft"),
  currency: z.string().default("AZN"),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.number().default(0),
  taxRate: z.number().default(0),
  includeVat: z.boolean().default(false),
  voen: z.string().optional().nullable(),
  sellerVoen: z.string().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  paymentTerms: z.string().default("net30"),
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
  documentLanguage: z.string().default("az"),
  customColumns: z.array(z.object({ key: z.string(), label: z.string() })).optional().nullable(),
  items: z.array(itemSchema).default([]),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const status = searchParams.get("status")
  const companyId = searchParams.get("companyId")
  const dealId = searchParams.get("dealId")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")

  try {
    const where: Record<string, unknown> = { organizationId: orgId }
    if (search) where.title = { contains: search, mode: "insensitive" }
    if (status) where.status = status
    if (companyId) where.companyId = companyId
    if (dealId) where.dealId = dealId
    if (dateFrom || dateTo) {
      where.issueDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      }
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { company: { select: { id: true, name: true } }, items: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { invoices, total, page, limit },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const d = parsed.data
    const invoiceNumber = await generateInvoiceNumber(orgId)

    const itemsData = d.items.map((item, idx) => ({
      ...item,
      total: calculateItemTotal(item),
      sortOrder: item.sortOrder || idx,
    }))

    const totals = calculateInvoiceTotals(d.items, d.discountType, d.discountValue, d.taxRate, d.includeVat)
    const issueDate = d.issueDate ? new Date(d.issueDate) : new Date()
    const dueDate = d.dueDate ? new Date(d.dueDate) : calculateDueDate(issueDate, d.paymentTerms, d.paymentTermsDays)

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: orgId,
        invoiceNumber,
        title: d.title,
        status: d.status,
        companyId: d.companyId || undefined,
        contactId: d.contactId || undefined,
        dealId: d.dealId || undefined,
        contractId: d.contractId || undefined,
        offerId: d.offerId || undefined,
        currency: d.currency,
        discountType: d.discountType,
        discountValue: d.discountValue,
        discountAmount: totals.discountAmount,
        taxRate: d.taxRate,
        taxAmount: totals.taxAmount,
        subtotal: totals.subtotal,
        totalAmount: totals.totalAmount,
        paidAmount: 0,
        balanceDue: totals.totalAmount,
        includeVat: d.includeVat,
        voen: d.voen,
        sellerVoen: d.sellerVoen,
        issueDate,
        dueDate,
        paymentTerms: d.paymentTerms,
        paymentTermsDays: d.paymentTermsDays,
        recipientEmail: d.recipientEmail,
        recipientName: d.recipientName,
        billingAddress: d.billingAddress,
        notes: d.notes,
        termsAndConditions: d.termsAndConditions,
        footerNote: d.footerNote,
        signerName: d.signerName,
        signerTitle: d.signerTitle,
        contractNumber: d.contractNumber,
        contractDate: d.contractDate,
        documentLanguage: d.documentLanguage,
        customColumns: d.customColumns || undefined,
        viewToken: crypto.randomUUID(),
        items: { create: itemsData },
      },
      include: { items: true, company: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
