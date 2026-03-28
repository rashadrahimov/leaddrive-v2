import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { calculateBalance } from "@/lib/invoice-calculations"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const authResult = await requireAuth(req, "finance", "delete")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const { id, paymentId } = await params

  try {
    const payment = await prisma.invoicePayment.findFirst({
      where: { id: paymentId, invoiceId: id, organizationId: orgId },
    })
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

    await prisma.invoicePayment.delete({ where: { id: paymentId } })

    const invoice = await prisma.invoice.findFirst({ where: { id, organizationId: orgId } })
    if (invoice) {
      const newPaidAmount = invoice.paidAmount - payment.amount
      const newBalanceDue = calculateBalance(invoice.totalAmount, newPaidAmount)
      let newStatus = invoice.status
      if (newPaidAmount <= 0) {
        newStatus = "sent"
      } else if (newBalanceDue > 0) {
        newStatus = "partially_paid"
      }

      await prisma.invoice.updateMany({
        where: { id, organizationId: orgId },
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
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
