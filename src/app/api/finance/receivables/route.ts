import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()

  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["sent", "viewed", "partially_paid", "overdue"] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      balanceDue: true,
      dueDate: true,
      status: true,
      companyId: true,
      company: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  })

  // Aging buckets
  const aging = [
    { label: "0-30 дн", amount: 0, count: 0 },
    { label: "31-60 дн", amount: 0, count: 0 },
    { label: "61-90 дн", amount: 0, count: 0 },
    { label: "90+ дн", amount: 0, count: 0 },
  ]

  const companyMap: Record<string, { companyName: string; companyId: string; amount: number; overdueAmount: number; invoiceCount: number }> = {}
  const overdueList: any[] = []

  let total = 0
  let overdueTotal = 0
  let overdueCount = 0

  invoices.forEach((inv) => {
    const balance = inv.balanceDue || 0
    total += balance

    // Aging
    if (inv.dueDate) {
      const days = Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000))
      const bucket = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3
      aging[bucket].amount += balance
      aging[bucket].count += 1

      // Overdue
      if (new Date(inv.dueDate) < now && balance > 0) {
        overdueTotal += balance
        overdueCount += 1
        overdueList.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          companyName: inv.company?.name || "Unknown",
          totalAmount: inv.totalAmount,
          balanceDue: balance,
          dueDate: inv.dueDate,
          daysOverdue: days,
        })
      }
    }

    // By company
    const cId = inv.companyId || "unknown"
    const cName = inv.company?.name || "Unknown"
    if (!companyMap[cId]) {
      companyMap[cId] = { companyName: cName, companyId: cId, amount: 0, overdueAmount: 0, invoiceCount: 0 }
    }
    companyMap[cId].amount += balance
    companyMap[cId].invoiceCount += 1
    if (inv.dueDate && new Date(inv.dueDate) < now) {
      companyMap[cId].overdueAmount += balance
    }
  })

  const topDebtors = Object.values(companyMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  return NextResponse.json({
    data: {
      total,
      overdueTotal,
      overdueCount,
      aging,
      topDebtors,
      overdueInvoices: overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 20),
    },
  })
}
