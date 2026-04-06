import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

type BudgetLineRow = { lineType: string; plannedAmount: number | null; forecastAmount: number | null; category: string | null; department: string | null }
type BudgetActualRow = { lineType: string; actualAmount: number | null; category: string | null; department: string | null; expenseDate: Date | null }
type InvoiceRow = { id: string; invoiceNumber: string | null; totalAmount: number; balanceDue: number | null; dueDate: Date | null; status: string; companyId: string | null }
type BillRow = { id: string; totalAmount: number; balanceDue: number | null; dueDate: Date | null; status: string }
type CashFlowRow = { month: number; entryType: string; amount: number }
type SalesForecastRow = { month: number; amount: number | null }
type FundRow = { currentBalance: number }

const MONTH_NAMES = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"]
const EXPENSE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"]

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year = parseInt(req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString())
  const now = new Date()
  const currentMonth = now.getMonth() + 1

  // Auto-update overdue statuses on dashboard load
  await Promise.all([
    prisma.bill.updateMany({
      where: { organizationId: orgId, dueDate: { lt: now }, status: { in: ["pending", "partially_paid"] }, balanceDue: { gt: 0 } },
      data: { status: "overdue" },
    }),
    prisma.invoice.updateMany({
      where: { organizationId: orgId, dueDate: { lt: now }, status: { in: ["sent", "viewed", "partially_paid"] }, balanceDue: { gt: 0 } },
      data: { status: "overdue" },
    }),
  ])

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
  const revenuePlan = (budgetLines as BudgetLineRow[])
    .filter((l: BudgetLineRow) => l.lineType === "revenue")
    .reduce((s: number, l: BudgetLineRow) => s + (l.plannedAmount || 0), 0)
  const revenueFact = (budgetActuals as BudgetActualRow[])
    .filter((a: BudgetActualRow) => a.lineType === "revenue")
    .reduce((s: number, a: BudgetActualRow) => s + (a.actualAmount || 0), 0)

  // Expense plan vs fact
  const expensePlan = (budgetLines as BudgetLineRow[])
    .filter((l: BudgetLineRow) => l.lineType === "expense" || l.lineType === "cogs")
    .reduce((s: number, l: BudgetLineRow) => s + (l.plannedAmount || 0), 0)
  const expenseFact = (budgetActuals as BudgetActualRow[])
    .filter((a: BudgetActualRow) => a.lineType === "expense" || a.lineType === "cogs")
    .reduce((s: number, a: BudgetActualRow) => s + (a.actualAmount || 0), 0)

  // Net profit
  const netProfit = revenueFact - expenseFact

  // Cash balance
  const totalInflows = (cashFlowEntries as CashFlowRow[]).filter((e: CashFlowRow) => e.entryType === "inflow").reduce((s: number, e: CashFlowRow) => s + e.amount, 0)
  const totalOutflows = (cashFlowEntries as CashFlowRow[]).filter((e: CashFlowRow) => e.entryType === "outflow").reduce((s: number, e: CashFlowRow) => s + e.amount, 0)
  const cashBalance = totalInflows - totalOutflows

  // A/R
  const arTotal = (invoices as InvoiceRow[]).reduce((s: number, i: InvoiceRow) => s + (i.balanceDue || 0), 0)
  const overdueInvoices = (invoices as InvoiceRow[]).filter((i: InvoiceRow) => i.status === "overdue" || (i.dueDate && new Date(i.dueDate) < now))
  const arOverdue = overdueInvoices.reduce((s: number, i: InvoiceRow) => s + (i.balanceDue || 0), 0)

  // A/P
  const apTotal = (bills as BillRow[]).reduce((s: number, b: BillRow) => s + (b.balanceDue || 0), 0)
  const overdueBills = (bills as BillRow[]).filter((b: BillRow) => b.status === "overdue" || (b.dueDate && new Date(b.dueDate) < now))
  const apOverdue = overdueBills.reduce((s: number, b: BillRow) => s + (b.balanceDue || 0), 0)

  // === Revenue Trend (12 months) ===
  const revenueTrend = []
  for (let m = 1; m <= 12; m++) {
    const monthRevenue = (budgetActuals as BudgetActualRow[])
      .filter((a: BudgetActualRow) => a.lineType === "revenue" && a.expenseDate && new Date(a.expenseDate).getMonth() + 1 === m)
      .reduce((s: number, a: BudgetActualRow) => s + (a.actualAmount || 0), 0)
    const monthExpense = (budgetActuals as BudgetActualRow[])
      .filter((a: BudgetActualRow) => (a.lineType === "expense" || a.lineType === "cogs") && a.expenseDate && new Date(a.expenseDate).getMonth() + 1 === m)
      .reduce((s: number, a: BudgetActualRow) => s + (a.actualAmount || 0), 0)
    // Fallback to sales forecast for revenue if no actuals
    const forecastRevenue = (salesForecasts as SalesForecastRow[])
      .filter((f: SalesForecastRow) => f.month === m)
      .reduce((s: number, f: SalesForecastRow) => s + (f.amount || 0), 0)

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
  ;(budgetActuals as BudgetActualRow[])
    .filter((a: BudgetActualRow) => a.lineType === "expense" || a.lineType === "cogs")
    .forEach((a: BudgetActualRow) => {
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

  // === A/R Aging (by days past due date) ===
  const agingBuckets = [
    { label: "Текущие", amount: 0, count: 0 },
    { label: "1-30", amount: 0, count: 0 },
    { label: "31-60", amount: 0, count: 0 },
    { label: "61-90", amount: 0, count: 0 },
    { label: "90+", amount: 0, count: 0 },
  ]
  ;(invoices as InvoiceRow[]).forEach((inv: InvoiceRow) => {
    if (!inv.dueDate) return
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000)
    const bucket = daysOverdue <= 0 ? 0 : daysOverdue <= 30 ? 1 : daysOverdue <= 60 ? 2 : daysOverdue <= 90 ? 3 : 4
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
      message: `${overdueInvoices.length} просроченных счетов — ${fmt(arOverdue)} AZN`,
      link: "/finance?tab=receivables",
      amount: arOverdue,
    })
  }
  if (cashBalance < 0) {
    alerts.push({
      id: "low-cash",
      type: "low_cash",
      severity: "critical",
      message: `Отрицательный остаток ДС: ${fmt(cashBalance)} AZN`,
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
      message: `Перерасход бюджета: ${fmt(overspend)} AZN (${Math.round((overspend / expensePlan) * 100)}% сверх плана)`,
      link: "/budgeting",
      amount: overspend,
    })
  }
  if (overdueBills.length > 0) {
    alerts.push({
      id: "ap-overdue",
      type: "upcoming_payment",
      severity: "warning",
      message: `${overdueBills.length} просроченных платежей — ${fmt(apOverdue)} AZN`,
      link: "/finance?tab=payables",
      amount: apOverdue,
    })
  }
  // Fund coverage alert
  const totalFundBalance = (funds as FundRow[]).reduce((s: number, f: FundRow) => s + (f.currentBalance || 0), 0)
  if (totalFundBalance > 0 && cashBalance < totalFundBalance) {
    const coverage = Math.round((cashBalance / totalFundBalance) * 100)
    alerts.push({
      id: "fund-coverage",
      type: "low_cash",
      severity: coverage < 50 ? "critical" : "warning",
      message: `Фонды обеспечены на ${coverage}% — зарезервировано ${fmt(totalFundBalance)} AZN, доступно ${fmt(cashBalance)} AZN`,
      link: "/finance?tab=funds",
      amount: totalFundBalance - cashBalance,
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
