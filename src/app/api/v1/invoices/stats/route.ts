import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: { status: true, totalAmount: true, paidAmount: true, balanceDue: true, subtotal: true, taxAmount: true, createdAt: true, issueDate: true },
    })

    const stats = {
      totalCount: invoices.length,
      totalAmount: 0,
      subtotalAmount: 0,
      taxAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      overdueAmount: 0,
      draftCount: 0,
      sentCount: 0,
      paidCount: 0,
      overdueCount: 0,
      partiallyPaidCount: 0,
      thisMonthCount: 0,
      thisMonthAmount: 0,
      thisYearCount: 0,
      thisYearAmount: 0,
      cancelledCount: 0,
    }

    for (const inv of invoices) {
      stats.totalAmount += inv.totalAmount
      stats.subtotalAmount += inv.subtotal
      stats.taxAmount += inv.taxAmount
      stats.paidAmount += inv.paidAmount
      const date = inv.issueDate || inv.createdAt
      if (date >= startOfMonth) { stats.thisMonthCount++; stats.thisMonthAmount += inv.totalAmount }
      if (date >= startOfYear) { stats.thisYearCount++; stats.thisYearAmount += inv.totalAmount }
      if (inv.status === "draft") stats.draftCount++
      else if (inv.status === "sent" || inv.status === "viewed") {
        stats.sentCount++
        stats.outstandingAmount += inv.balanceDue
      } else if (inv.status === "paid") stats.paidCount++
      else if (inv.status === "overdue") {
        stats.overdueCount++
        stats.overdueAmount += inv.balanceDue
        stats.outstandingAmount += inv.balanceDue
      } else if (inv.status === "partially_paid") {
        stats.partiallyPaidCount++
        stats.outstandingAmount += inv.balanceDue
      } else if (inv.status === "cancelled") stats.cancelledCount++
    }

    const avgAmount = stats.totalCount > 0 ? stats.totalAmount / stats.totalCount : 0

    return NextResponse.json({ success: true, data: {
      ...stats,
      avgAmount,
      totalInvoiced: stats.totalAmount,
      totalSubtotal: stats.subtotalAmount,
      totalTax: stats.taxAmount,
      totalPaid: stats.paidAmount,
      totalOutstanding: stats.outstandingAmount,
      totalOverdue: stats.overdueAmount,
      currency: "AZN",
    } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
