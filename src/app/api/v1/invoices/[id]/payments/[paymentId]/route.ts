import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { calculateBalance } from "@/lib/invoice-calculations"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, paymentId } = await params

  try {
    const payment = await prisma.invoicePayment.findFirst({
      where: { id: paymentId, invoiceId: id, organizationId: orgId },
    })
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

    await prisma.invoicePayment.delete({ where: { id: paymentId } })

    const invoice = await prisma.invoice.findUnique({ where: { id } })
    if (invoice) {
      const newPaidAmount = invoice.paidAmount - payment.amount
      const newBalanceDue = calculateBalance(invoice.totalAmount, newPaidAmount)
      let newStatus = invoice.status
      if (newPaidAmount <= 0) {
        newStatus = "sent"
      } else if (newBalanceDue > 0) {
        newStatus = "partially_paid"
      }

      await prisma.invoice.update({
        where: { id },
        data: {
          paidAmount: Math.max(0, newPaidAmount),
          balanceDue: newBalanceDue,
          status: newStatus,
          paidAt: null,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
