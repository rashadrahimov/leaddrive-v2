import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — list payments for a bill
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const payments = await prisma.billPayment.findMany({
    where: { billId: id, organizationId: orgId },
    orderBy: { paymentDate: "desc" },
  })

  return NextResponse.json({ data: payments })
}

// POST — add payment to a bill
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: billId } = await params

  const body = await req.json()
  const { amount, paymentMethod, paymentDate, reference, notes, currency } = body

  if (!amount) {
    return NextResponse.json({ error: "amount required" }, { status: 400 })
  }

  const paymentAmount = parseFloat(amount)

  // Create payment
  const payment = await prisma.billPayment.create({
    data: {
      organizationId: orgId,
      billId,
      amount: paymentAmount,
      currency: currency || "AZN",
      paymentMethod: paymentMethod || "bank_transfer",
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      reference: reference || null,
      notes: notes || null,
    },
  })

  // Update bill totals
  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (bill) {
    const newPaid = bill.paidAmount + paymentAmount
    const newBalance = Math.max(0, bill.totalAmount - newPaid)
    const newStatus = newBalance <= 0 ? "paid" : newPaid > 0 ? "partially_paid" : bill.status

    await prisma.bill.update({
      where: { id: billId },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        status: newStatus,
        ...(newBalance <= 0 ? { paidAt: new Date() } : {}),
      },
    })
  }

  return NextResponse.json({ data: payment }, { status: 201 })
}
