import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const MONTH_NAMES = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"]
const EXPENSE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"]

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year = parseInt(req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString())
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  // Run all queries in parallel
  const [
    budgetLines,
    budgetActuals,
    invoices,
    bills,
    cashFlowEntries,
    salesForecasts,
    funds,
  ] = await Promise.all([
    // Revenue/Expense plan (from budget lines of approved/draft plans)
    prisma.budgetLine.findMany({
      where: {
        organizationId: orgId,
        plan: { year, status: { in: ["approved", "draft"] } },
      },
      select: { lineType: true, plannedAmount: true, forecastAmount: true, category: true, department: true },
    }),
    // Actuals
    prisma.budgetActual.findMany({
      where: { organizationId: orgId, plan: { year } },
      select: { lineType: true, actualAmount: true, category: true, department: true, expenseDate: true },
    }),
    // Invoices for A/R
    prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["sent", "viewed", "partially_paid", "overdue"] },
      },
      select: { id: true, invoiceNumber: true, totalAmount: true, balanceDue: true, dueDate: true, status: true, companyId: true },
    }),
    // Bills for A/P
    prisma.bill.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["pending", "partially_paid", "overdue"] },
      },
      select: { id: true, totalAmount: true, balanceDue: true, dueDate: true, status: true },
    }),
    // Cash flow
    prisma.cashFlowEntry.findMany({
      where: { organizationId: orgId, year },
      select: { month: true, entryType: true, amount: true },
    }),
    // Sales forecast for revenue trend
    prisma.salesForecast.findMany({
      where: { organizationId: orgId, year },
      select: { month: true, amount: true },
    }),
    // Funds total
    prisma.fund.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { currentBalance: true },
    }),
  ])

  // === KPIs ===

  // Revenue plan vs fact
  const revenuePlan = budgetLines
    .filter((l) => l.lineType === "revenue")
    .reduce((s, l) => s + (l.plannedAmount || 0), 0)
  const revenueFact = budgetActuals
    .filter((a) => a.lineType === "revenue")
    .reduce((s, a) => s + (a.actualAmount || 0), 0)

  // Expense plan vs fact
  const expensePlan = budgetLines
    .filter((l) => l.lineType === "expense" || l.lineType === "cogs")
    .reduce((s, l) => s + (l.plannedAmount || 0), 0)
  const expenseFact = budgetActuals
    .filter((a) => a.lineType === "expense" || a.lineType === "cogs")
    .reduce((s, a) => s + (a.actualAmount || 0), 0)

  // Net profit
  const netProfit = revenueFact - expenseFact

  // Cash balance
  const totalInflows = cashFlowEntries.filter((e) => e.entryType === "inflow").reduce((s, e) => s + e.amount, 0)
  const totalOutflows = cashFlowEntries.filter((e) => e.entryType === "outflow").reduce((s, e) => s + e.amount, 0)
  const cashBalance = totalInflows - totalOutflows

  // A/R
  const arTotal = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0)
  const overdueInvoices = invoices.filter((i) => i.status === "overdue" || (i.dueDate && new Date(i.dueDate) < now))
  const arOverdue = overdueInvoices.reduce((s, i) => s + (i.balanceDue || 0), 0)

  // A/P
  const apTotal = bills.reduce((s, b) => s + (b.balanceDue || 0), 0)
  const overdueBills = bills.filter((b) => b.status === "overdue" || (b.dueDate && new Date(b.dueDate) < now))
  const apOverdue = overdueBills.reduce((s, b) => s + (b.balanceDue || 0), 0)

  // === Revenue Trend (12 months) ===
  const revenueTrend = []
  for (let m = 1; m <= 12; m++) {
    const monthRevenue = budgetActuals
      .filter((a) => a.lineType === "revenue" && a.expenseDate && new Date(a.expenseDate).getMonth() + 1 === m)
      .reduce((s, a) => s + (a.actualAmount || 0), 0)
    const monthExpense = budgetActuals
      .filter((a) => (a.lineType === "expense" || a.lineType === "cogs") && a.expenseDate && new Date(a.expenseDate).getMonth() + 1 === m)
      .reduce((s, a) => s + (a.actualAmount || 0), 0)
    // Fallback to sales forecast for revenue if no actuals
    const forecastRevenue = salesForecasts
      .filter((f) => f.month === m)
      .reduce((s, f) => s + (f.amount || 0), 0)

    revenueTrend.push({
      month: m,
      year,
      label: MONTH_NAMES[m - 1],
      revenue: monthRevenue || forecastRevenue,
      expenses: monthExpense,
      net: (monthRevenue || forecastRevenue) - monthExpense,
    })
  }

  // === Expense Breakdown ===
  const categoryMap: Record<string, number> = {}
  budgetActuals
    .filter((a) => a.lineType === "expense" || a.lineType === "cogs")
    .forEach((a) => {
      const cat = a.category || a.department || "Other"
      categoryMap[cat] = (categoryMap[cat] || 0) + (a.actualAmount || 0)
    })
  const sortedCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const otherAmount = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(6)
    .reduce((s, [, v]) => s + v, 0)
  const totalExp = expenseFact || 1
  const expenseBreakdown = sortedCategories.map(([category, amount], i) => ({
    category,
    amount,
    pct: Math.round((amount / totalExp) * 100),
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  }))
  if (otherAmount > 0) {
    expenseBreakdown.push({ category: "Other", amount: otherAmount, pct: Math.round((otherAmount / totalExp) * 100), color: "#94a3b8" })
  }

  // === A/R Aging ===
  const agingBuckets = [
    { label: "0-30", amount: 0, count: 0 },
    { label: "31-60", amount: 0, count: 0 },
    { label: "61-90", amount: 0, count: 0 },
    { label: "90+", amount: 0, count: 0 },
  ]
  invoices.forEach((inv) => {
    if (!inv.dueDate) return
    const days = Math.max(0, Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000))
    const bucket = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3
    agingBuckets[bucket].amount += inv.balanceDue || 0
    agingBuckets[bucket].count += 1
  })

  // === Alerts ===
  const alerts: any[] = []
  if (overdueInvoices.length > 0) {
    alerts.push({
      id: "ar-overdue",
      type: "overdue_invoice",
      severity: overdueInvoices.length > 5 ? "critical" : "warning",
      message: `${overdueInvoices.length} overdue invoice(s) — ${fmt(arOverdue)} AZN`,
      link: "/finance?tab=receivables",
      amount: arOverdue,
    })
  }
  if (cashBalance < 0) {
    alerts.push({
      id: "low-cash",
      type: "low_cash",
      severity: "critical",
      message: `Negative cash balance: ${fmt(cashBalance)} AZN`,
      link: "/budgeting?tab=cash-flow",
      amount: cashBalance,
    })
  }
  if (expenseFact > expensePlan && expensePlan > 0) {
    const overspend = expenseFact - expensePlan
    alerts.push({
      id: "budget-overspend",
      type: "budget_overspend",
      severity: "warning",
      message: `Budget overspend: ${fmt(overspend)} AZN (${Math.round((overspend / expensePlan) * 100)}% over plan)`,
      link: "/budgeting",
      amount: overspend,
    })
  }
  if (overdueBills.length > 0) {
    alerts.push({
      id: "ap-overdue",
      type: "upcoming_payment",
      severity: "warning",
      message: `${overdueBills.length} overdue bill(s) — ${fmt(apOverdue)} AZN`,
      link: "/finance?tab=payables",
      amount: apOverdue,
    })
  }

  const safeDiv = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 100))

  return NextResponse.json({
    data: {
      kpis: {
        revenue: { label: "Revenue", plan: revenuePlan, fact: revenueFact, variance: revenueFact - revenuePlan, variancePct: safeDiv(revenueFact, revenuePlan) },
        expenses: { label: "Expenses", plan: expensePlan, fact: expenseFact, variance: expenseFact - expensePlan, variancePct: safeDiv(expenseFact, expensePlan) },
        netProfit: { fact: netProfit, prevMonth: 0, changePct: 0 },
        cashBalance: { current: cashBalance, projected: cashBalance + totalInflows * 0.1 },
        arTotal: { amount: arTotal, overdueAmount: arOverdue, overdueCount: overdueInvoices.length },
        apTotal: { amount: apTotal, overdueAmount: apOverdue, overdueCount: overdueBills.length },
      },
      revenueTrend,
      expenseBreakdown,
      arAging: agingBuckets,
      alerts,
      year,
    },
  })
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}
