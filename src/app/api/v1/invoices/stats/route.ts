import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: { status: true, totalAmount: true, paidAmount: true, balanceDue: true },
    })

    const stats = {
      totalCount: invoices.length,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      overdueAmount: 0,
      draftCount: 0,
      sentCount: 0,
      paidCount: 0,
      overdueCount: 0,
      partiallyPaidCount: 0,
    }

    for (const inv of invoices) {
      stats.totalAmount += inv.totalAmount
      stats.paidAmount += inv.paidAmount
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
      }
    }

    return NextResponse.json({ success: true, data: {
      ...stats,
      totalInvoiced: stats.totalAmount,
      totalPaid: stats.paidAmount,
      totalOutstanding: stats.outstandingAmount,
      totalOverdue: stats.overdueAmount,
      currency: "AZN",
    } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
