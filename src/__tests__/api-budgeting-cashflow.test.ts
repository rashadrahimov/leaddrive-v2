import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cashFlowEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
    },
    cashFlowAlert: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    budgetPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    budgetLine: {
      findMany: vi.fn(),
    },
    budgetActual: {
      findMany: vi.fn(),
    },
    budgetForecastEntry: {
      findMany: vi.fn(),
    },
    salesForecast: {
      findMany: vi.fn(),
    },
    expenseForecast: {
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

import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

import { GET as getCashFlow, POST as postCashFlow } from "@/app/api/budgeting/cash-flow/route"
import { POST as postGenerate } from "@/app/api/budgeting/cash-flow/generate/route"
import { GET as getPlanFact } from "@/app/api/budgeting/cash-flow/plan-fact/route"
import { GET as getAlerts, POST as postAlerts } from "@/app/api/budgeting/cash-flow/alerts/route"

function makeReq(url: string, opts?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), opts)
}

const ORG = "org-test-123"

beforeEach(() => {
  vi.clearAllMocks()
})

// ═════════════════════════════════════════════════════════════════════════════
// cash-flow/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/cash-flow", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getCashFlow(makeReq("http://localhost:3000/api/budgeting/cash-flow?year=2026"))
    expect(res.status).toBe(401)
  })

  it("returns monthly cash flow summary with running balance", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)

    const entries = [
      { id: "e1", month: 1, entryType: "inflow", amount: 10000, year: 2026 },
      { id: "e2", month: 1, entryType: "outflow", amount: 3000, year: 2026 },
      { id: "e3", month: 2, entryType: "inflow", amount: 5000, year: 2026 },
    ]

    // Current year entries
    vi.mocked(prisma.cashFlowEntry.findMany)
      .mockResolvedValueOnce(entries as any)   // year = 2026
      .mockResolvedValueOnce([] as any)        // prev year = 2025

    const res = await getCashFlow(makeReq("http://localhost:3000/api/budgeting/cash-flow?year=2026"))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.year).toBe(2026)
    expect(body.months).toHaveLength(12)
    expect(body.totalInflows).toBe(15000)
    expect(body.totalOutflows).toBe(3000)

    // Month 1: opening=0, inflows=10000, outflows=3000 -> closing=7000
    expect(body.months[0].inflows).toBe(10000)
    expect(body.months[0].outflows).toBe(3000)
    expect(body.months[0].closing).toBe(7000)

    // Month 2: opening=7000, inflows=5000 -> closing=12000
    expect(body.months[1].opening).toBe(7000)
    expect(body.months[1].closing).toBe(12000)
  })
})

describe("POST /api/budgeting/cash-flow", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await postCashFlow(makeReq("http://localhost:3000/api/budgeting/cash-flow", {
      method: "POST",
      body: JSON.stringify({ year: 2026, month: 1, entryType: "inflow", amount: 1000 }),
    }))
    expect(res.status).toBe(401)
  })

  it("creates a cash flow entry with valid data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const created = { id: "cf1", organizationId: ORG, year: 2026, month: 3, entryType: "inflow", amount: 5000 }
    vi.mocked(prisma.cashFlowEntry.create).mockResolvedValue(created as any)

    const res = await postCashFlow(makeReq("http://localhost:3000/api/budgeting/cash-flow", {
      method: "POST",
      body: JSON.stringify({ year: 2026, month: 3, entryType: "inflow", amount: 5000, description: "Client payment" }),
    }))
    expect(res.status).toBe(201)
    expect(prisma.cashFlowEntry.create).toHaveBeenCalledOnce()
  })

  it("returns 400 on validation failure (invalid month)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postCashFlow(makeReq("http://localhost:3000/api/budgeting/cash-flow", {
      method: "POST",
      body: JSON.stringify({ year: 2026, month: 13, entryType: "inflow", amount: 100 }),
    }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Validation")
  })

  it("returns 400 on invalid JSON body", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postCashFlow(makeReq("http://localhost:3000/api/budgeting/cash-flow", {
      method: "POST",
      body: "not-json",
    }))
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// cash-flow/generate/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/budgeting/cash-flow/generate", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await postGenerate(makeReq("http://localhost:3000/api/budgeting/cash-flow/generate", {
      method: "POST",
      body: JSON.stringify({ year: 2026 }),
    }))
    expect(res.status).toBe(401)
  })

  it("generates entries from budget plans and returns count", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.cashFlowEntry.deleteMany).mockResolvedValue({ count: 0 } as any)

    // Budget plans for 2026
    vi.mocked(prisma.budgetPlan.findMany).mockResolvedValue([
      { id: "plan1", year: 2026, periodType: "annual", quarter: null, month: null, isRolling: false, organizationId: ORG },
    ] as any)

    // Budget lines in plan1
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([
      { id: "bl1", planId: "plan1", lineType: "revenue", plannedAmount: 12000, category: "Sales" },
      { id: "bl2", planId: "plan1", lineType: "expense", plannedAmount: 6000, category: "Salary" },
    ] as any)

    // Cash flow entry creation
    vi.mocked(prisma.cashFlowEntry.create).mockResolvedValue({} as any)

    // Invoice model (may not exist)
    // After generation: findMany for alerts calculation
    vi.mocked(prisma.cashFlowEntry.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.cashFlowAlert.findFirst).mockResolvedValue(null as any)

    const res = await postGenerate(makeReq("http://localhost:3000/api/budgeting/cash-flow/generate", {
      method: "POST",
      body: JSON.stringify({ year: 2026 }),
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.year).toBe(2026)
    // 2 lines * 12 months = 24 entries
    expect(body.entriesCreated).toBe(24)
    expect(prisma.cashFlowEntry.deleteMany).toHaveBeenCalledOnce()
  })

  it("returns 400 on validation failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postGenerate(makeReq("http://localhost:3000/api/budgeting/cash-flow/generate", {
      method: "POST",
      body: JSON.stringify({ year: 1999 }),
    }))
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// cash-flow/plan-fact/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/cash-flow/plan-fact", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getPlanFact(makeReq("http://localhost:3000/api/budgeting/cash-flow/plan-fact?year=2026"))
    expect(res.status).toBe(401)
  })

  it("returns plan vs fact monthly data with totals", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)

    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([
      { lineType: "revenue", plannedAmount: 50000, department: "Sales" },
    ] as any)
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([
      { lineType: "revenue", actualAmount: 8000, expenseDate: new Date(2026, 0, 15), department: "Sales" },
    ] as any)
    vi.mocked(prisma.salesForecast.findMany).mockResolvedValue([
      { month: 1, amount: 10000, budgetDept: { label: "Sales" } },
    ] as any)
    vi.mocked(prisma.expenseForecast.findMany).mockResolvedValue([
      { month: 1, amount: 3000, budgetCostType: { label: "Infra" } },
    ] as any)

    const res = await getPlanFact(makeReq("http://localhost:3000/api/budgeting/cash-flow/plan-fact?year=2026"))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data.year).toBe(2026)
    expect(body.data.monthly).toHaveLength(12)
    // Month 1 should have revenuePlan=10000, revenueFact=8000
    expect(body.data.monthly[0].revenuePlan).toBe(10000)
    expect(body.data.monthly[0].revenueFact).toBe(8000)
    expect(body.data.monthly[0].revenueVariance).toBe(-2000)
    expect(body.data.totals).toBeDefined()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// cash-flow/alerts/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/cash-flow/alerts", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getAlerts(makeReq("http://localhost:3000/api/budgeting/cash-flow/alerts?year=2026"))
    expect(res.status).toBe(401)
  })

  it("returns unresolved alerts for a year", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const alerts = [
      { id: "a1", year: 2026, month: 4, alertType: "negative_balance", isResolved: false, message: "Negative balance" },
    ]
    vi.mocked(prisma.cashFlowAlert.findMany).mockResolvedValue(alerts as any)

    const res = await getAlerts(makeReq("http://localhost:3000/api/budgeting/cash-flow/alerts?year=2026"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].alertType).toBe("negative_balance")
  })
})

describe("POST /api/budgeting/cash-flow/alerts (resolve)", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await postAlerts(makeReq("http://localhost:3000/api/budgeting/cash-flow/alerts", {
      method: "POST",
      body: JSON.stringify({ alertId: "a1" }),
    }))
    expect(res.status).toBe(401)
  })

  it("resolves an alert successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.cashFlowAlert.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await postAlerts(makeReq("http://localhost:3000/api/budgeting/cash-flow/alerts", {
      method: "POST",
      body: JSON.stringify({ alertId: "alert-abc" }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(prisma.cashFlowAlert.updateMany).toHaveBeenCalledWith({
      where: { id: "alert-abc", organizationId: ORG },
      data: { isResolved: true },
    })
  })

  it("returns 400 on missing alertId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postAlerts(makeReq("http://localhost:3000/api/budgeting/cash-flow/alerts", {
      method: "POST",
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })
})
