import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

/**
 * POST /api/v1/invoices/fix-balances
 * One-time data fix: recalculate balanceDue for all invoices based on actual payments.
 * Fixes invoices marked "paid" that still show full balanceDue.
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      include: { payments: true },
    })

    let fixed = 0
    const fixes: { id: string; invoiceNumber: string; oldBalance: number; newBalance: number; oldStatus: string; newStatus: string }[] = []

    for (const inv of invoices) {
      const actualPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0)
      const correctBalance = Math.max(0, Math.round((inv.totalAmount - actualPaid) * 100) / 100)

      let correctStatus = inv.status
      if (actualPaid > 0 && correctBalance <= 0) {
        correctStatus = "paid"
      } else if (actualPaid > 0 && correctBalance > 0) {
        correctStatus = "partially_paid"
      }
      // Don't change draft/cancelled/refunded statuses
      if (["draft", "cancelled", "refunded"].includes(inv.status)) {
        correctStatus = inv.status
      }

      const balanceChanged = Math.abs(inv.balanceDue - correctBalance) > 0.001
      const paidChanged = Math.abs(inv.paidAmount - actualPaid) > 0.001
      const statusChanged = inv.status !== correctStatus

      if (balanceChanged || paidChanged || statusChanged) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            paidAmount: Math.round(actualPaid * 100) / 100,
            balanceDue: correctBalance,
            status: correctStatus,
            ...(correctBalance <= 0 && actualPaid > 0 ? { paidAt: inv.paidAt || new Date() } : {}),
          },
        })
        fixes.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          oldBalance: inv.balanceDue,
          newBalance: correctBalance,
          oldStatus: inv.status,
          newStatus: correctStatus,
        })
        fixed++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: invoices.length,
        fixed,
        fixes,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
