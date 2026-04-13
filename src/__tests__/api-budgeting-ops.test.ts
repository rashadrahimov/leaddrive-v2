import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budgetActual: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    budgetPlan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    budgetLine: {
      findMany: vi.fn(),
    },
    budgetForecastEntry: {
      findMany: vi.fn(),
    },
    budgetDirectionTemplate: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    budgetDepartment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    budgetCostType: {
      findMany: vi.fn(),
    },
    currencyRateHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    currency: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  logBudgetChange: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/budgeting/department-access", () => ({
  buildDeptFilter: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/budgeting/currency", () => ({
  processCurrencyFields: vi.fn().mockImplementation((_orgId, amount, currency, rate) => ({
    plannedAmount: amount,
    currencyCode: currency || "AZN",
    exchangeRate: rate || 1,
    originalAmount: amount,
  })),
}))

vi.mock("@/lib/cost-model/db", () => ({
  loadAndCompute: vi.fn().mockResolvedValue({ grandTotalG: 0, serviceRevenues: {}, serviceDetails: {} }),
}))

vi.mock("@/lib/budgeting/cost-model-map", () => ({
  resolveCostModelKey: vi.fn().mockReturnValue(0),
  resolvePatternForDept: vi.fn().mockReturnValue(null),
  getPeriodMonths: vi.fn().mockReturnValue({ count: 12, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
  computePlannedForLine: vi.fn().mockReturnValue(0),
}))

vi.mock("exceljs", () => ({
  default: {
    Workbook: vi.fn().mockImplementation(() => ({
      addWorksheet: vi.fn().mockReturnValue({
        columns: [],
        addRow: vi.fn().mockReturnValue({ getCell: vi.fn().mockReturnValue({}), eachCell: vi.fn(), height: 0 }),
        getRow: vi.fn().mockReturnValue({ eachCell: vi.fn(), height: 0 }),
        views: [],
        autoFilter: null,
      }),
      xlsx: { writeBuffer: vi.fn().mockResolvedValue(Buffer.from("fake-xlsx")) },
    })),
  },
}))

import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

import { GET as getActuals, POST as postActuals } from "@/app/api/budgeting/actuals/route"
import { GET as getTemplates, POST as postTemplates } from "@/app/api/budgeting/templates/route"
import { GET as getDepartments, POST as postDepartments, PUT as putDepartments, DELETE as deleteDepartments } from "@/app/api/budgeting/departments/route"
import { GET as getExchangeRates, POST as postExchangeRates } from "@/app/api/budgeting/exchange-rates/route"
import { GET as getAnalytics } from "@/app/api/budgeting/analytics/route"

function makeReq(url: string, opts?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), opts)
}

const ORG = "org-test-789"

beforeEach(() => {
  vi.clearAllMocks()
})

// ═════════════════════════════════════════════════════════════════════════════
// actuals/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/actuals", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await getActuals(makeReq("http://localhost:3000/api/budgeting/actuals?planId=p1"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when planId is missing", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: ORG, userId: "u1", role: "admin" } as any)
    const res = await getActuals(makeReq("http://localhost:3000/api/budgeting/actuals"))
    expect(res.status).toBe(400)
  })

  it("returns actuals for a plan", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: ORG, userId: "u1", role: "admin" } as any)
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([
      { id: "ba1", planId: "p1", category: "Salary", actualAmount: 5000, lineType: "expense" },
    ] as any)

    const res = await getActuals(makeReq("http://localhost:3000/api/budgeting/actuals?planId=p1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})

describe("POST /api/budgeting/actuals", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await postActuals(makeReq("http://localhost:3000/api/budgeting/actuals", {
      method: "POST",
      body: JSON.stringify({ planId: "p1", category: "Salary", actualAmount: 5000 }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 403 when plan is approved", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "approved" } as any)

    const res = await postActuals(makeReq("http://localhost:3000/api/budgeting/actuals", {
      method: "POST",
      body: JSON.stringify({ planId: "p1", category: "Salary", actualAmount: 5000 }),
    }))
    expect(res.status).toBe(403)
  })

  it("creates an actual entry with currency processing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "draft" } as any)
    const actual = { id: "ba-new", planId: "p1", category: "Cloud", actualAmount: 3000, lineType: "expense" }
    vi.mocked(prisma.budgetActual.create).mockResolvedValue(actual as any)

    const res = await postActuals(makeReq("http://localhost:3000/api/budgeting/actuals", {
      method: "POST",
      body: JSON.stringify({ planId: "p1", category: "Cloud", actualAmount: 3000 }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(prisma.budgetActual.create).toHaveBeenCalledOnce()
  })

  it("returns 400 when planId or category is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postActuals(makeReq("http://localhost:3000/api/budgeting/actuals", {
      method: "POST",
      body: JSON.stringify({ category: "Salary" }),
    }))
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// templates/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/templates", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getTemplates(makeReq("http://localhost:3000/api/budgeting/templates"))
    expect(res.status).toBe(401)
  })

  it("returns all templates for the org", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDirectionTemplate.findMany).mockResolvedValue([
      { id: "t1", name: "IT Revenue", lineType: "revenue" },
    ] as any)

    const res = await getTemplates(makeReq("http://localhost:3000/api/budgeting/templates"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
  })
})

describe("POST /api/budgeting/templates", () => {
  it("creates a template with valid data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const created = { id: "t-new", name: "Marketing Expense", lineType: "expense", defaultAmount: 1000 }
    vi.mocked(prisma.budgetDirectionTemplate.create).mockResolvedValue(created as any)

    const res = await postTemplates(makeReq("http://localhost:3000/api/budgeting/templates", {
      method: "POST",
      body: JSON.stringify({ name: " Marketing Expense ", defaultAmount: 1000 }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe("t-new")
    // Name should be trimmed
    expect(prisma.budgetDirectionTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Marketing Expense" }),
      }),
    )
  })

  it("returns 400 on validation failure (missing name)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postTemplates(makeReq("http://localhost:3000/api/budgeting/templates", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    }))
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// departments/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/departments", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getDepartments(makeReq("http://localhost:3000/api/budgeting/departments"))
    expect(res.status).toBe(401)
  })

  it("returns active departments by default", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDepartment.findMany).mockResolvedValue([
      { id: "d1", key: "it", label: "IT", isActive: true, sortOrder: 0 },
    ] as any)

    const res = await getDepartments(makeReq("http://localhost:3000/api/budgeting/departments"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    // Should filter active-only
    expect(prisma.budgetDepartment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      }),
    )
  })

  it("includes inactive departments when requested", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDepartment.findMany).mockResolvedValue([] as any)

    await getDepartments(makeReq("http://localhost:3000/api/budgeting/departments?includeInactive=true"))
    expect(prisma.budgetDepartment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ isActive: true }),
      }),
    )
  })
})

describe("POST /api/budgeting/departments", () => {
  it("returns 409 when key already exists", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDepartment.findUnique).mockResolvedValue({ id: "d-existing" } as any)

    const res = await postDepartments(makeReq("http://localhost:3000/api/budgeting/departments", {
      method: "POST",
      body: JSON.stringify({ key: "it", label: "IT" }),
    }))
    expect(res.status).toBe(409)
  })

  it("creates a new department", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDepartment.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.budgetDepartment.create).mockResolvedValue({ id: "d-new", key: "sec", label: "Security" } as any)

    const res = await postDepartments(makeReq("http://localhost:3000/api/budgeting/departments", {
      method: "POST",
      body: JSON.stringify({ key: "sec", label: "Security", hasRevenue: false }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe("PUT /api/budgeting/departments", () => {
  it("updates a department", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDepartment.update).mockResolvedValue({ id: "d1", label: "IT Dept Updated" } as any)

    const res = await putDepartments(makeReq("http://localhost:3000/api/budgeting/departments", {
      method: "PUT",
      body: JSON.stringify({ id: "d1", label: "IT Dept Updated" }),
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

describe("DELETE /api/budgeting/departments (soft delete)", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await deleteDepartments(makeReq("http://localhost:3000/api/budgeting/departments?id=d1", { method: "DELETE" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when id is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await deleteDepartments(makeReq("http://localhost:3000/api/budgeting/departments", { method: "DELETE" }))
    expect(res.status).toBe(400)
  })

  it("soft-deletes a department (sets isActive=false)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDepartment.update).mockResolvedValue({ id: "d1", isActive: false } as any)

    const res = await deleteDepartments(makeReq("http://localhost:3000/api/budgeting/departments?id=d1", { method: "DELETE" }))
    expect(res.status).toBe(200)
    expect(prisma.budgetDepartment.update).toHaveBeenCalledWith({
      where: { id: "d1", organizationId: ORG },
      data: { isActive: false },
    })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// exchange-rates/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/exchange-rates", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getExchangeRates(makeReq("http://localhost:3000/api/budgeting/exchange-rates"))
    expect(res.status).toBe(401)
  })

  it("returns rates and currencies", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.currencyRateHistory.findMany).mockResolvedValue([
      { id: "r1", currencyCode: "USD", rate: 1.7, rateDate: new Date() },
    ] as any)
    vi.mocked(prisma.currency.findMany).mockResolvedValue([
      { id: "c1", code: "USD", exchangeRate: 1.7 },
      { id: "c2", code: "EUR", exchangeRate: 1.85 },
    ] as any)

    const res = await getExchangeRates(makeReq("http://localhost:3000/api/budgeting/exchange-rates"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.rates).toHaveLength(1)
    expect(body.currencies).toHaveLength(2)
  })
})

describe("POST /api/budgeting/exchange-rates", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await postExchangeRates(makeReq("http://localhost:3000/api/budgeting/exchange-rates", {
      method: "POST",
      body: JSON.stringify({ currencyCode: "USD", rate: 1.7 }),
    }))
    expect(res.status).toBe(401)
  })

  it("creates a rate entry and updates Currency table", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.currencyRateHistory.create).mockResolvedValue({ id: "r-new", currencyCode: "USD", rate: 1.72 } as any)
    vi.mocked(prisma.currency.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await postExchangeRates(makeReq("http://localhost:3000/api/budgeting/exchange-rates", {
      method: "POST",
      body: JSON.stringify({ currencyCode: "USD", rate: 1.72 }),
    }))
    expect(res.status).toBe(201)
    expect(prisma.currency.updateMany).toHaveBeenCalledWith({
      where: { organizationId: ORG, code: "USD" },
      data: { exchangeRate: 1.72 },
    })
  })

  it("returns 400 on validation failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postExchangeRates(makeReq("http://localhost:3000/api/budgeting/exchange-rates", {
      method: "POST",
      body: JSON.stringify({ rate: 1.7 }),
    }))
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// analytics/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/analytics", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getAnalytics(makeReq("http://localhost:3000/api/budgeting/analytics?planId=p1"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when planId is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getAnalytics(makeReq("http://localhost:3000/api/budgeting/analytics"))
    expect(res.status).toBe(400)
  })

  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.budgetCostType.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.budgetDepartment.findMany).mockResolvedValue([] as any)

    const res = await getAnalytics(makeReq("http://localhost:3000/api/budgeting/analytics?planId=nonexistent"))
    expect(res.status).toBe(404)
  })

  it("returns full analytics data for a valid plan", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const plan = { id: "p1", year: 2026, periodType: "annual", quarter: null, month: null, status: "draft" }
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(plan as any)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([
      { id: "bl1", planId: "p1", category: "Revenue", lineType: "revenue", plannedAmount: 100000, forecastAmount: null, isAutoActual: false, isAutoPlanned: false, department: "Sales", parentId: null, costModelKey: null, costTypeId: null, departmentId: null },
      { id: "bl2", planId: "p1", category: "Salary", lineType: "expense", plannedAmount: 40000, forecastAmount: null, isAutoActual: false, isAutoPlanned: false, department: "IT", parentId: null, costModelKey: null, costTypeId: null, departmentId: null },
    ] as any)
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([
      { id: "ba1", planId: "p1", category: "Revenue", lineType: "revenue", actualAmount: 30000, department: "Sales", expenseDate: null },
      { id: "ba2", planId: "p1", category: "Salary", lineType: "expense", actualAmount: 12000, department: "IT", expenseDate: null },
    ] as any)
    vi.mocked(prisma.budgetCostType.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.budgetDepartment.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.budgetForecastEntry.findMany).mockResolvedValue([] as any)

    const res = await getAnalytics(makeReq("http://localhost:3000/api/budgeting/analytics?planId=p1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.totalRevenuePlanned).toBe(100000)
    expect(body.data.totalRevenueActual).toBe(30000)
    expect(body.data.totalExpensePlanned).toBe(40000)
    expect(body.data.totalExpenseActual).toBe(12000)
    expect(body.data.byCategory).toHaveLength(2)
    expect(body.data.byDepartment).toHaveLength(2)
    expect(body.data.executionPct).toBeGreaterThan(0)
  })
})
