import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bill: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    bankAccount: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    fund: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    budgetLine: {
      findMany: vi.fn(),
    },
    budgetActual: {
      findMany: vi.fn(),
    },
    cashFlowEntry: {
      findMany: vi.fn(),
    },
    salesForecast: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/constants", () => ({
  DEFAULT_CURRENCY: "AZN",
}))

import { GET as GET_DASHBOARD } from "@/app/api/finance/dashboard/route"
import { GET as GET_BANK_ACCOUNTS, POST as POST_BANK_ACCOUNT } from "@/app/api/finance/bank-accounts/route"
import { PUT as PUT_BANK_ACCOUNT, DELETE as DELETE_BANK_ACCOUNT } from "@/app/api/finance/bank-accounts/[id]/route"
import { GET as GET_FUNDS, POST as POST_FUND } from "@/app/api/finance/funds/route"
import { GET as GET_PAYABLES, POST as POST_PAYABLE } from "@/app/api/finance/payables/route"
import { GET as GET_RECEIVABLES } from "@/app/api/finance/receivables/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── FINANCE DASHBOARD ──────────────────────────────────────────────

describe("GET /api/finance/dashboard", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_DASHBOARD(makeRequest("/api/finance/dashboard"))
    expect(res.status).toBe(401)
  })

  it("returns dashboard data with KPIs and trends", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bill.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.invoice.updateMany).mockResolvedValue({ count: 0 })
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([
      { lineType: "revenue", plannedAmount: 100000, forecastAmount: 100000, category: "sales", department: null },
      { lineType: "expense", plannedAmount: 60000, forecastAmount: 60000, category: "salaries", department: "dev" },
    ] as any)
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([
      { lineType: "revenue", actualAmount: 90000, category: "sales", department: null, expenseDate: new Date("2026-03-15") },
      { lineType: "expense", actualAmount: 55000, category: "salaries", department: "dev", expenseDate: new Date("2026-03-15") },
    ] as any)
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.bill.findMany).mockResolvedValue([])
    vi.mocked(prisma.cashFlowEntry.findMany).mockResolvedValue([
      { month: 3, entryType: "inflow", amount: 80000 },
      { month: 3, entryType: "outflow", amount: 50000 },
    ] as any)
    vi.mocked(prisma.salesForecast.findMany).mockResolvedValue([])
    vi.mocked(prisma.fund.findMany).mockResolvedValue([])

    const res = await GET_DASHBOARD(makeRequest("/api/finance/dashboard?year=2026"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.kpis).toBeDefined()
    expect(json.data.kpis.revenue.plan).toBe(100000)
    expect(json.data.kpis.revenue.fact).toBe(90000)
    expect(json.data.kpis.netProfit.fact).toBe(35000) // 90000 - 55000
    expect(json.data.kpis.cashBalance.current).toBe(30000) // 80000 - 50000
    expect(json.data.revenueTrend).toHaveLength(12)
    expect(json.data.year).toBe(2026)
  })

  it("auto-updates overdue bill and invoice statuses", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bill.updateMany).mockResolvedValue({ count: 2 })
    vi.mocked(prisma.invoice.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([])
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.bill.findMany).mockResolvedValue([])
    vi.mocked(prisma.cashFlowEntry.findMany).mockResolvedValue([])
    vi.mocked(prisma.salesForecast.findMany).mockResolvedValue([])
    vi.mocked(prisma.fund.findMany).mockResolvedValue([])

    await GET_DASHBOARD(makeRequest("/api/finance/dashboard"))

    expect(prisma.bill.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "overdue" } }),
    )
    expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "overdue" } }),
    )
  })
})

// ─── BANK ACCOUNTS ──────────────────────────────────────────────────

describe("GET /api/finance/bank-accounts", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_BANK_ACCOUNTS(makeRequest("/api/finance/bank-accounts"))
    expect(res.status).toBe(401)
  })

  it("returns list of bank accounts", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const accounts = [{ id: "ba1", accountName: "Main", bankName: "Kapital" }]
    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue(accounts as any)

    const res = await GET_BANK_ACCOUNTS(makeRequest("/api/finance/bank-accounts"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual(accounts)
  })
})

describe("POST /api/finance/bank-accounts", () => {
  it("returns 400 on validation failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await POST_BANK_ACCOUNT(makeRequest("/api/finance/bank-accounts", {
      method: "POST",
      body: JSON.stringify({ accountName: "" }),
    }))
    expect(res.status).toBe(400)
  })

  it("creates bank account and unsets other defaults", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bankAccount.updateMany).mockResolvedValue({ count: 1 })
    const account = { id: "ba2", accountName: "USD Account", bankName: "ABB", isDefault: true }
    vi.mocked(prisma.bankAccount.create).mockResolvedValue(account as any)

    const res = await POST_BANK_ACCOUNT(makeRequest("/api/finance/bank-accounts", {
      method: "POST",
      body: JSON.stringify({ accountName: "USD Account", bankName: "ABB", isDefault: true }),
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toEqual(account)
    expect(prisma.bankAccount.updateMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", isDefault: true },
      data: { isDefault: false },
    })
  })
})

describe("PUT /api/finance/bank-accounts/[id]", () => {
  it("returns 404 when account not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue(null)

    const res = await PUT_BANK_ACCOUNT(
      makeRequest("/api/finance/bank-accounts/ba1", { method: "PUT", body: JSON.stringify({ accountName: "Updated" }) }),
      makeParams("ba1"),
    )
    expect(res.status).toBe(404)
  })

  it("updates bank account", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue({ id: "ba1" } as any)
    vi.mocked(prisma.bankAccount.update).mockResolvedValue({ id: "ba1", accountName: "Updated" } as any)

    const res = await PUT_BANK_ACCOUNT(
      makeRequest("/api/finance/bank-accounts/ba1", { method: "PUT", body: JSON.stringify({ accountName: "Updated" }) }),
      makeParams("ba1"),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.accountName).toBe("Updated")
  })
})

describe("DELETE /api/finance/bank-accounts/[id]", () => {
  it("returns 404 when account not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue(null)

    const res = await DELETE_BANK_ACCOUNT(
      makeRequest("/api/finance/bank-accounts/ba1", { method: "DELETE" }),
      makeParams("ba1"),
    )
    expect(res.status).toBe(404)
  })

  it("deletes bank account", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue({ id: "ba1" } as any)
    vi.mocked(prisma.bankAccount.delete).mockResolvedValue({} as any)

    const res = await DELETE_BANK_ACCOUNT(
      makeRequest("/api/finance/bank-accounts/ba1", { method: "DELETE" }),
      makeParams("ba1"),
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
  })
})

// ─── FUNDS ──────────────────────────────────────────────────────────

describe("GET /api/finance/funds", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_FUNDS(makeRequest("/api/finance/funds"))
    expect(res.status).toBe(401)
  })

  it("returns funds with rules included", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const funds = [{ id: "f1", name: "Reserve", rules: [] }]
    vi.mocked(prisma.fund.findMany).mockResolvedValue(funds as any)

    const res = await GET_FUNDS(makeRequest("/api/finance/funds"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual(funds)
    expect(prisma.fund.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      include: { rules: true },
      orderBy: { createdAt: "asc" },
    })
  })
})

describe("POST /api/finance/funds", () => {
  it("returns 400 on invalid body", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await POST_FUND(makeRequest("/api/finance/funds", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    }))
    expect(res.status).toBe(400)
  })

  it("creates a fund", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const fund = { id: "f2", name: "Emergency", targetAmount: 10000 }
    vi.mocked(prisma.fund.create).mockResolvedValue(fund as any)

    const res = await POST_FUND(makeRequest("/api/finance/funds", {
      method: "POST",
      body: JSON.stringify({ name: "Emergency", targetAmount: 10000 }),
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toEqual(fund)
  })
})

// ─── PAYABLES (BILLS) ───────────────────────────────────────────────

describe("GET /api/finance/payables", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_PAYABLES(makeRequest("/api/finance/payables"))
    expect(res.status).toBe(401)
  })

  it("returns bills with optional status filter", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const bills = [{ id: "b1", vendorName: "AWS", totalAmount: 5000, status: "pending" }]
    vi.mocked(prisma.bill.findMany).mockResolvedValue(bills as any)

    const res = await GET_PAYABLES(makeRequest("/api/finance/payables?status=pending"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual(bills)
    expect(prisma.bill.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: "org-1", status: "pending" },
      }),
    )
  })
})

describe("POST /api/finance/payables", () => {
  it("returns 400 on validation failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await POST_PAYABLE(makeRequest("/api/finance/payables", {
      method: "POST",
      body: JSON.stringify({ vendorName: "AWS" }),
    }))
    expect(res.status).toBe(400)
  })

  it("creates a bill with balanceDue = totalAmount", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const bill = { id: "b2", vendorName: "AWS", totalAmount: 3000, balanceDue: 3000, status: "pending" }
    vi.mocked(prisma.bill.create).mockResolvedValue(bill as any)

    const res = await POST_PAYABLE(makeRequest("/api/finance/payables", {
      method: "POST",
      body: JSON.stringify({ vendorName: "AWS", title: "Cloud hosting", totalAmount: 3000 }),
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toEqual(bill)
    const createCall = vi.mocked(prisma.bill.create).mock.calls[0][0]
    expect(createCall.data.balanceDue).toBe(3000)
    expect(createCall.data.status).toBe("pending")
  })
})

// ─── RECEIVABLES ────────────────────────────────────────────────────

describe("GET /api/finance/receivables", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_RECEIVABLES(makeRequest("/api/finance/receivables"))
    expect(res.status).toBe(401)
  })

  it("returns receivables with aging buckets and top debtors", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const pastDueDate = new Date(Date.now() - 15 * 86400000).toISOString()
    const invoices = [
      {
        id: "inv1",
        invoiceNumber: "INV-001",
        totalAmount: 5000,
        balanceDue: 3000,
        dueDate: new Date(pastDueDate),
        status: "overdue",
        companyId: "c1",
        company: { id: "c1", name: "Acme Corp" },
      },
    ]
    vi.mocked(prisma.invoice.findMany).mockResolvedValue(invoices as any)

    const res = await GET_RECEIVABLES(makeRequest("/api/finance/receivables"))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.total).toBe(3000)
    expect(json.data.overdueTotal).toBe(3000)
    expect(json.data.overdueCount).toBe(1)
    expect(json.data.aging).toHaveLength(5)
    // 15 days overdue should be in bucket index 1 (1-30 days)
    expect(json.data.aging[1].amount).toBe(3000)
    expect(json.data.topDebtors).toHaveLength(1)
    expect(json.data.topDebtors[0].companyName).toBe("Acme Corp")
  })
})
