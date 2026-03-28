import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { calculateBalance } from "@/lib/invoice-calculations"

const paymentSchema = z.object({
  amount: z.number().min(0.01),
  currency: z.string().default("AZN"),
  paymentMethod: z.enum(["bank_transfer", "cash", "card", "check", "other"]).default("bank_transfer"),
  paymentDate: z.string().optional(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const payments = await prisma.invoicePayment.findMany({
      where: { invoiceId: id, organizationId: orgId },
      orderBy: { paymentDate: "desc" },
    })
    return NextResponse.json({ success: true, data: payments })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    const d = parsed.data
    const payment = await prisma.invoicePayment.create({
      data: {
        organizationId: orgId,
        invoiceId: id,
        amount: d.amount,
        currency: d.currency,
        paymentMethod: d.paymentMethod,
        paymentDate: d.paymentDate ? new Date(d.paymentDate) : new Date(),
        reference: d.reference,
        notes: d.notes,
      },
    })

    const newPaidAmount = invoice.paidAmount + d.amount
    const newBalanceDue = calculateBalance(invoice.totalAmount, newPaidAmount)
    let newStatus = invoice.status
    if (newBalanceDue <= 0) {
      newStatus = "paid"
    } else if (newPaidAmount > 0) {
      newStatus = "partially_paid"
    }

    await prisma.invoice.updateMany({
      where: { id, organizationId: orgId },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: Math.max(0, newBalanceDue),
        status: newStatus,
        ...(newBalanceDue <= 0 ? { paidAt: new Date() } : {}),
      },
    })

    // Auto-stop communication chain when invoice is fully paid
    if (newBalanceDue <= 0) {
      const activeChain = await prisma.journeyEnrollment.findFirst({
        where: { invoiceId: id, organizationId: orgId, status: "active" },
      })
      if (activeChain) {
        await prisma.journeyEnrollment.update({
          where: { id: activeChain.id },
          data: { status: "completed", completedAt: new Date() },
        })
        await prisma.journey.update({
          where: { id: activeChain.journeyId },
          data: { activeCount: { decrement: 1 }, completedCount: { increment: 1 } },
        })
      }
    }

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
