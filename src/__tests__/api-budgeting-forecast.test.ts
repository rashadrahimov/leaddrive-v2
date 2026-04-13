import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budgetForecastEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    budgetPlan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    budgetLine: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    budgetActual: {
      findMany: vi.fn(),
    },
    salesForecast: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      $transaction: vi.fn(),
    },
    expenseForecast: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rollingForecastMonth: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  logBudgetChange: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/cost-model/db", () => ({
  loadAndCompute: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

import { GET as getForecast, POST as postForecast } from "@/app/api/budgeting/forecast/route"
import { GET as getSalesForecast, POST as postSalesForecast } from "@/app/api/budgeting/sales-forecast/route"
import { GET as getExpenseForecast, POST as postExpenseForecast } from "@/app/api/budgeting/expense-forecast/route"
import { POST as postRolling, PATCH as patchRolling, GET as getRolling } from "@/app/api/budgeting/rolling/route"

function makeReq(url: string, opts?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), opts)
}

const ORG = "org-test-456"

beforeEach(() => {
  vi.clearAllMocks()
})

// ═════════════════════════════════════════════════════════════════════════════
// forecast/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/forecast", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getForecast(makeReq("http://localhost:3000/api/budgeting/forecast?planId=p1"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when planId is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getForecast(makeReq("http://localhost:3000/api/budgeting/forecast"))
    expect(res.status).toBe(400)
  })

  it("returns forecast entries for a plan", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const entries = [
      { id: "fe1", planId: "p1", year: 2026, month: 1, category: "Salary", lineType: "expense", forecastAmount: 5000 },
    ]
    vi.mocked(prisma.budgetForecastEntry.findMany).mockResolvedValue(entries as any)

    const res = await getForecast(makeReq("http://localhost:3000/api/budgeting/forecast?planId=p1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})

describe("POST /api/budgeting/forecast", () => {
  it("returns 403 when plan is approved", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "approved" } as any)
    vi.mocked(prisma.budgetForecastEntry.findUnique).mockResolvedValue(null as any)

    const res = await postForecast(makeReq("http://localhost:3000/api/budgeting/forecast", {
      method: "POST",
      body: JSON.stringify({
        planId: "p1", month: 1, year: 2026, category: "Salary", forecastAmount: 5000,
      }),
    }))
    expect(res.status).toBe(403)
  })

  it("upserts a single forecast entry", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "draft" } as any)
    vi.mocked(prisma.budgetForecastEntry.findUnique).mockResolvedValue(null as any)
    const upserted = { id: "fe2", planId: "p1", year: 2026, month: 3, category: "Rent", lineType: "expense", forecastAmount: 2000 }
    vi.mocked(prisma.budgetForecastEntry.upsert).mockResolvedValue(upserted as any)

    const res = await postForecast(makeReq("http://localhost:3000/api/budgeting/forecast", {
      method: "POST",
      body: JSON.stringify({
        planId: "p1", month: 3, year: 2026, category: "Rent", forecastAmount: 2000,
      }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// sales-forecast/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/sales-forecast", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getSalesForecast(makeReq("http://localhost:3000/api/budgeting/sales-forecast?year=2026"))
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid year", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getSalesForecast(makeReq("http://localhost:3000/api/budgeting/sales-forecast?year=1900"))
    expect(res.status).toBe(400)
  })

  it("returns sales forecast entries", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.salesForecast.findMany).mockResolvedValue([
      { id: "sf1", departmentId: "d1", month: 1, year: 2026, amount: 10000, budgetDept: { id: "d1", key: "it", label: "IT" } },
    ] as any)

    const res = await getSalesForecast(makeReq("http://localhost:3000/api/budgeting/sales-forecast?year=2026"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})

describe("POST /api/budgeting/sales-forecast", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await postSalesForecast(makeReq("http://localhost:3000/api/budgeting/sales-forecast", {
      method: "POST",
      body: JSON.stringify({ year: 2026, entries: [{ departmentId: "d1", month: 1, amount: 5000 }] }),
    }))
    expect(res.status).toBe(401)
  })

  it("upserts sales forecast entries via $transaction", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.$transaction).mockResolvedValue([{ id: "sf-new" }] as any)

    const res = await postSalesForecast(makeReq("http://localhost:3000/api/budgeting/sales-forecast", {
      method: "POST",
      body: JSON.stringify({ year: 2026, entries: [{ departmentId: "d1", month: 1, amount: 8000 }] }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(1)
  })

  it("returns 400 on validation failure (empty entries)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await postSalesForecast(makeReq("http://localhost:3000/api/budgeting/sales-forecast", {
      method: "POST",
      body: JSON.stringify({ year: 2026, entries: [] }),
    }))
    expect(res.status).toBe(400)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// expense-forecast/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/budgeting/expense-forecast", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getExpenseForecast(makeReq("http://localhost:3000/api/budgeting/expense-forecast?year=2026"))
    expect(res.status).toBe(401)
  })

  it("returns expense forecast entries for a year", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.expenseForecast.findMany).mockResolvedValue([
      { id: "ef1", costTypeId: "ct1", month: 2, year: 2026, amount: 3000, budgetCostType: { id: "ct1", key: "infra", label: "Infra", isShared: false }, budgetDept: null },
    ] as any)

    const res = await getExpenseForecast(makeReq("http://localhost:3000/api/budgeting/expense-forecast?year=2026"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })
})

describe("POST /api/budgeting/expense-forecast", () => {
  it("creates new expense forecast entries", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.expenseForecast.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.expenseForecast.create).mockResolvedValue({ id: "ef-new" } as any)

    const res = await postExpenseForecast(makeReq("http://localhost:3000/api/budgeting/expense-forecast", {
      method: "POST",
      body: JSON.stringify({
        year: 2026,
        entries: [{ costTypeId: "ct1", month: 3, amount: 4500 }],
      }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(1)
  })

  it("updates existing expense forecast entries", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.expenseForecast.findFirst).mockResolvedValue({ id: "ef-existing" } as any)
    vi.mocked(prisma.expenseForecast.update).mockResolvedValue({ id: "ef-existing", amount: 6000 } as any)

    const res = await postExpenseForecast(makeReq("http://localhost:3000/api/budgeting/expense-forecast", {
      method: "POST",
      body: JSON.stringify({
        year: 2026,
        entries: [{ costTypeId: "ct1", month: 3, amount: 6000 }],
      }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.count).toBe(1)
    expect(prisma.expenseForecast.update).toHaveBeenCalledOnce()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// rolling/route.ts
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/budgeting/rolling (create rolling plan)", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await postRolling(makeReq("http://localhost:3000/api/budgeting/rolling", {
      method: "POST",
      body: JSON.stringify({ name: "Rolling 2026", startYear: 2026, startMonth: 1 }),
    }))
    expect(res.status).toBe(401)
  })

  it("creates a rolling plan with month entries", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const plan = { id: "rp1", name: "Rolling 2026", isRolling: true, year: 2026, month: 1 }
    vi.mocked(prisma.budgetPlan.create).mockResolvedValue(plan as any)
    vi.mocked(prisma.rollingForecastMonth.createMany).mockResolvedValue({ count: 12 } as any)
    // No source plan to clone from
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null as any)

    const res = await postRolling(makeReq("http://localhost:3000/api/budgeting/rolling", {
      method: "POST",
      body: JSON.stringify({ name: "Rolling 2026", startYear: 2026, startMonth: 1 }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("rp1")
    expect(prisma.rollingForecastMonth.createMany).toHaveBeenCalledOnce()
  })
})

describe("GET /api/budgeting/rolling", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await getRolling(makeReq("http://localhost:3000/api/budgeting/rolling?planId=rp1"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when planId is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getRolling(makeReq("http://localhost:3000/api/budgeting/rolling"))
    expect(res.status).toBe(400)
  })

  it("returns 404 when rolling plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null as any)

    const res = await getRolling(makeReq("http://localhost:3000/api/budgeting/rolling?planId=nonexistent"))
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/budgeting/rolling (close/reopen month)", () => {
  it("returns 404 when rolling plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null as any)

    const res = await patchRolling(makeReq("http://localhost:3000/api/budgeting/rolling", {
      method: "PATCH",
      body: JSON.stringify({ planId: "rp-missing", year: 2026, month: 1 }),
    }))
    expect(res.status).toBe(404)
  })
})
