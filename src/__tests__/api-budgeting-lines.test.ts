import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budgetLine: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    budgetPlan: {
      findFirst: vi.fn(),
    },
    salesForecast: {
      findMany: vi.fn(),
    },
    expenseForecast: {
      findMany: vi.fn(),
    },
  },
  logBudgetChange: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/cost-model/db", () => ({
  loadAndCompute: vi.fn().mockResolvedValue(null),
}))

vi.mock("@/lib/budgeting/cost-model-map", () => ({
  getPeriodMonths: vi.fn().mockReturnValue({ count: 12, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
  computePlannedForLine: vi.fn().mockReturnValue(0),
}))

vi.mock("@/lib/budgeting/department-access", () => ({
  buildDeptFilter: vi.fn().mockResolvedValue({}),
}))

vi.mock("@/lib/budgeting/currency", () => ({
  processCurrencyFields: vi.fn().mockResolvedValue({
    plannedAmount: 100,
    currencyCode: null,
    exchangeRate: null,
    originalAmount: null,
  }),
}))

import { GET, POST } from "@/app/api/budgeting/lines/route"
import { prisma, logBudgetChange } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { processCurrencyFields } from "@/lib/budgeting/currency"

const ORG = "org-test-123"
const USER = "user-1"

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function jsonReq(body: unknown): NextRequest {
  return makeReq("http://localhost:3000/api/budgeting/lines", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

/* ───────────── GET /api/budgeting/lines ───────────── */

describe("GET /api/budgeting/lines", () => {
  it("returns 401 when session is missing", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    const res = await GET(makeReq("http://localhost:3000/api/budgeting/lines"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 400 when planId query param is missing", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: ORG, userId: USER, role: "admin" } as any)
    const res = await GET(makeReq("http://localhost:3000/api/budgeting/lines"))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("planId required")
  })

  it("returns lines with children when planId is provided", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: ORG, userId: USER, role: "admin" } as any)
    const lines = [
      { id: "l1", category: "IT", isAutoPlanned: false, children: [{ id: "l1c1", isAutoPlanned: false }] },
    ]
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue(lines as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "plan-1", year: 2026, periodType: "annual" } as any)

    const res = await GET(makeReq("http://localhost:3000/api/budgeting/lines?planId=plan-1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].children).toHaveLength(1)
  })

  it("returns empty array when no lines exist for the plan", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: ORG, userId: USER, role: "admin" } as any)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([])
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "plan-1", year: 2026 } as any)

    const res = await GET(makeReq("http://localhost:3000/api/budgeting/lines?planId=plan-1"))
    const json = await res.json()
    expect(json.data).toEqual([])
  })
})

/* ───────────── POST /api/budgeting/lines ───────────── */

describe("POST /api/budgeting/lines", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await POST(jsonReq({ planId: "p1", category: "Test" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const req = makeReq("http://localhost:3000/api/budgeting/lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "bad json!",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid JSON")
  })

  it("returns 400 when category is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq({ planId: "p1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/required|Validation failed/)
  })

  it("returns 400 when planId is missing (neither planId nor plan_id)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await POST(jsonReq({ category: "IT" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/required|Validation failed/)
  })

  it("returns 403 when plan status is approved", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "approved", organizationId: ORG } as any)

    const res = await POST(jsonReq({ planId: "p1", category: "IT", plannedAmount: 500 }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain("утверждён")
  })

  it("returns 400 when plannedAmount is negative via zod min(0)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq({ planId: "p1", category: "IT", plannedAmount: -100 }))
    expect(res.status).toBe(400)
  })

  it("resolves plan_id when planId is not provided", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "draft", organizationId: ORG } as any)
    vi.mocked(processCurrencyFields).mockResolvedValue({ plannedAmount: 200, currencyCode: null, exchangeRate: null, originalAmount: null })
    const createdLine = { id: "line-1", planId: "p1", category: "Cloud" }
    vi.mocked(prisma.budgetLine.create).mockResolvedValue(createdLine as any)

    const res = await POST(jsonReq({ plan_id: "p1", category: "Cloud", planned_amount: 200 }))
    expect(res.status).toBe(201)
    expect(prisma.budgetLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planId: "p1" }),
      }),
    )
  })

  it("creates line successfully and logs budget change", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "draft", organizationId: ORG } as any)
    vi.mocked(processCurrencyFields).mockResolvedValue({ plannedAmount: 1000, currencyCode: null, exchangeRate: null, originalAmount: null })
    const createdLine = { id: "line-new", planId: "p1", category: "Salary", lineType: "expense", plannedAmount: 1000 }
    vi.mocked(prisma.budgetLine.create).mockResolvedValue(createdLine as any)

    const res = await POST(jsonReq({ planId: "p1", category: "Salary", lineType: "expense", plannedAmount: 1000 }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("line-new")
    expect(logBudgetChange).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: ORG,
        planId: "p1",
        entityType: "line",
        entityId: "line-new",
        action: "create",
      }),
    )
  })

  it("calls processCurrencyFields with the resolved amount", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", status: "draft", organizationId: ORG } as any)
    vi.mocked(processCurrencyFields).mockResolvedValue({ plannedAmount: 85, currencyCode: "EUR", exchangeRate: 1.17, originalAmount: 100 })
    vi.mocked(prisma.budgetLine.create).mockResolvedValue({ id: "lx" } as any)

    await POST(jsonReq({ planId: "p1", category: "Travel", plannedAmount: 100, currencyCode: "EUR", exchangeRate: 1.17 }))

    expect(processCurrencyFields).toHaveBeenCalledWith(ORG, 100, "EUR", 1.17)
    expect(prisma.budgetLine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currencyCode: "EUR",
          exchangeRate: 1.17,
          originalAmount: 100,
          plannedAmount: 85,
        }),
      }),
    )
  })
})
