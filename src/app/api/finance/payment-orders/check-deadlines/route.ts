import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { notifyOverdueBills, notifyOverdueInvoices, notifyUpcomingDeadlines } from "@/lib/finance/telegram-notify"

// POST — check and update overdue bills and invoices + send Telegram notifications
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()

  // Find bills that will become overdue (before updating)
  const newOverdueBills = await prisma.bill.findMany({
    where: {
      organizationId: orgId,
      dueDate: { lt: now },
      status: { in: ["pending", "partially_paid"] },
      balanceDue: { gt: 0 },
    },
    select: { billNumber: true, vendorName: true, balanceDue: true, dueDate: true },
  })

  const newOverdueInvoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      dueDate: { lt: now },
      status: { in: ["sent", "viewed", "partially_paid"] },
      balanceDue: { gt: 0 },
    },
    select: { invoiceNumber: true, balanceDue: true, dueDate: true, recipientName: true, company: { select: { name: true } } },
  })

  // Update statuses
  const [overdueBills, overdueInvoices] = await Promise.all([
    prisma.bill.updateMany({
      where: { organizationId: orgId, dueDate: { lt: now }, status: { in: ["pending", "partially_paid"] }, balanceDue: { gt: 0 } },
      data: { status: "overdue" },
    }),
    prisma.invoice.updateMany({
      where: { organizationId: orgId, dueDate: { lt: now }, status: { in: ["sent", "viewed", "partially_paid"] }, balanceDue: { gt: 0 } },
      data: { status: "overdue" },
    }),
  ])

  // Send Telegram notifications for newly overdue items
  if (newOverdueBills.length > 0) {
    await notifyOverdueBills(newOverdueBills.map((b) => ({
      billNumber: b.billNumber, vendorName: b.vendorName, amount: b.balanceDue, dueDate: b.dueDate!,
    })))
  }
  if (newOverdueInvoices.length > 0) {
    await notifyOverdueInvoices(newOverdueInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber || "N/A",
      companyName: inv.company?.name || inv.recipientName || "Unknown",
      amount: inv.balanceDue || 0,
      dueDate: inv.dueDate!,
    })))
  }

  // Check upcoming deadlines (7 days) and notify
  const deadline = new Date(now.getTime() + 7 * 86400000)
  const [upcomingBills, upcomingInvoices] = await Promise.all([
    prisma.bill.findMany({
      where: { organizationId: orgId, dueDate: { gte: now, lte: deadline }, status: { notIn: ["paid", "cancelled", "overdue"] }, balanceDue: { gt: 0 } },
      select: { billNumber: true, vendorName: true, balanceDue: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, dueDate: { gte: now, lte: deadline }, status: { notIn: ["paid", "cancelled", "refunded", "overdue"] }, balanceDue: { gt: 0 } },
      select: { invoiceNumber: true, balanceDue: true, dueDate: true, recipientName: true, company: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ])

  if (upcomingBills.length > 0 || upcomingInvoices.length > 0) {
    await notifyUpcomingDeadlines(
      upcomingBills.map((b) => ({ billNumber: b.billNumber, vendorName: b.vendorName, amount: b.balanceDue, dueDate: b.dueDate! })),
      upcomingInvoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber || "N/A",
        companyName: inv.company?.name || inv.recipientName || "Unknown",
        amount: inv.balanceDue || 0,
        dueDate: inv.dueDate!,
      })),
      7,
    )
  }

  return NextResponse.json({
    data: {
      billsUpdated: overdueBills.count,
      invoicesUpdated: overdueInvoices.count,
      upcomingBills: upcomingBills.length,
      upcomingInvoices: upcomingInvoices.length,
    },
  })
}

// GET — get upcoming deadlines (bills/invoices due within N days)
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const daysAhead = parseInt(searchParams.get("days") || "7")

  const now = new Date()
  const deadline = new Date(now.getTime() + daysAhead * 86400000)

  const [upcomingBills, upcomingInvoices] = await Promise.all([
    prisma.bill.findMany({
      where: { organizationId: orgId, dueDate: { gte: now, lte: deadline }, status: { notIn: ["paid", "cancelled"] }, balanceDue: { gt: 0 } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId, dueDate: { gte: now, lte: deadline }, status: { notIn: ["paid", "cancelled", "refunded"] }, balanceDue: { gt: 0 } },
      select: { id: true, invoiceNumber: true, totalAmount: true, balanceDue: true, dueDate: true, status: true, recipientName: true, company: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
  ])

  return NextResponse.json({ data: { upcomingBills, upcomingInvoices, daysAhead } })
}
