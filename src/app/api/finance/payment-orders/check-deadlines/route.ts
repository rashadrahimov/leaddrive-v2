import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// POST — check and update overdue bills and invoices
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()

  // Update overdue bills
  const overdueBills = await prisma.bill.updateMany({
    where: {
      organizationId: orgId,
      dueDate: { lt: now },
      status: { in: ["pending", "partially_paid"] },
      balanceDue: { gt: 0 },
    },
    data: { status: "overdue" },
  })

  // Update overdue invoices
  const overdueInvoices = await prisma.invoice.updateMany({
    where: {
      organizationId: orgId,
      dueDate: { lt: now },
      status: { in: ["sent", "viewed", "partially_paid"] },
      balanceDue: { gt: 0 },
    },
    data: { status: "overdue" },
  })

  return NextResponse.json({
    data: {
      billsUpdated: overdueBills.count,
      invoicesUpdated: overdueInvoices.count,
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
      where: {
        organizationId: orgId,
        dueDate: { gte: now, lte: deadline },
        status: { notIn: ["paid", "cancelled"] },
        balanceDue: { gt: 0 },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        dueDate: { gte: now, lte: deadline },
        status: { notIn: ["paid", "cancelled", "refunded"] },
        balanceDue: { gt: 0 },
      },
      select: {
        id: true, invoiceNumber: true, totalAmount: true, balanceDue: true,
        dueDate: true, status: true, recipientName: true,
        company: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ])

  return NextResponse.json({
    data: { upcomingBills, upcomingInvoices, daysAhead },
  })
}
