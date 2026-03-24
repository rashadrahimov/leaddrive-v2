import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { generateInvoiceNumber } from "@/lib/invoice-number"
import { calculateItemTotal, calculateInvoiceTotals, calculateDueDate } from "@/lib/invoice-calculations"
import { formatMonthYear } from "@/lib/invoice-templates"
import { addDays, addWeeks, addMonths, addYears } from "date-fns"
import crypto from "crypto"

function calculateNextRunDate(current: Date, frequency: string, interval: number): Date {
  switch (frequency) {
    case "daily": return addDays(current, interval)
    case "weekly": return addWeeks(current, interval)
    case "monthly": return addMonths(current, interval)
    case "quarterly": return addMonths(current, interval * 3)
    case "yearly": return addYears(current, interval)
    default: return addMonths(current, interval)
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const now = new Date()
    const recurring = await prisma.recurringInvoice.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        nextRunDate: { lte: now },
      },
      include: { items: true },
    })

    const generated: string[] = []

    for (const rec of recurring) {
      if (rec.maxOccurrences && rec.totalGenerated >= rec.maxOccurrences) {
        await prisma.recurringInvoice.update({
          where: { id: rec.id },
          data: { isActive: false },
        })
        continue
      }

      if (rec.endDate && rec.endDate < now) {
        await prisma.recurringInvoice.update({
          where: { id: rec.id },
          data: { isActive: false },
        })
        continue
      }

      const invoiceNumber = await generateInvoiceNumber(orgId)
      const items = rec.items.map((item: any) => ({
        productId: item.productId || undefined,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: calculateItemTotal({ quantity: item.quantity, unitPrice: item.unitPrice, discount: item.discount }),
        sortOrder: item.sortOrder,
      }))

      const totals = calculateInvoiceTotals(
        items.map((i: any) => ({ quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })),
        "percentage", 0, rec.taxRate, rec.includeVat
      )

      const issueDate = new Date()
      const dueDate = calculateDueDate(issueDate, rec.paymentTerms)

      // Generate title from template or use static title
      const template = (rec as any).titleTemplate as string | null
      let invoiceTitle = rec.title
      if (template) {
        const monthYear = formatMonthYear(issueDate, "az")
        const [monthName, yearStr] = monthYear.split(" ")
        invoiceTitle = template
          .replace(/\{month\}/gi, monthName || "")
          .replace(/\{year\}/gi, yearStr || String(issueDate.getFullYear()))
          .replace(/\{number\}/gi, String(rec.totalGenerated + 1))
      }

      await prisma.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber,
          title: invoiceTitle,
          recurringInvoiceId: rec.id,
          companyId: rec.companyId || undefined,
          contactId: rec.contactId || undefined,
          dealId: rec.dealId || undefined,
          contractId: rec.contractId || undefined,
          currency: rec.currency,
          includeVat: rec.includeVat,
          taxRate: rec.taxRate,
          voen: rec.voen,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          paidAmount: 0,
          balanceDue: totals.totalAmount,
          issueDate,
          dueDate,
          paymentTerms: rec.paymentTerms,
          recipientEmail: rec.recipientEmail,
          notes: rec.notes,
          termsAndConditions: rec.termsAndConditions,
          viewToken: crypto.randomUUID(),
          items: { create: items },
        },
      })

      const nextRunDate = calculateNextRunDate(rec.nextRunDate || now, rec.frequency, rec.intervalCount)
      await prisma.recurringInvoice.update({
        where: { id: rec.id },
        data: {
          lastRunDate: now,
          nextRunDate,
          totalGenerated: { increment: 1 },
        },
      })

      generated.push(invoiceNumber)
    }

    return NextResponse.json({ success: true, data: { generated, count: generated.length } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
