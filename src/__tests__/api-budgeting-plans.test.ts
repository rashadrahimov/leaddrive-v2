import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budgetPlan: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    budgetLine: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    salesForecast: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/cost-model/db", () => ({
  loadAndCompute: vi.fn().mockResolvedValue({ serviceDetails: {} }),
}))

import { GET, POST } from "@/app/api/budgeting/plans/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const ORG = "org-test-123"

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function jsonReq(body: unknown): NextRequest {
  return makeReq("http://localhost:3000/api/budgeting/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

/* ───────────── GET /api/budgeting/plans ───────────── */

describe("GET /api/budgeting/plans", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await GET(makeReq("http://localhost:3000/api/budgeting/plans"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns plans ordered by year desc, month desc", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const plans = [
      { id: "p1", name: "2026 Annual", year: 2026, month: null },
      { id: "p2", name: "2025 Dec", year: 2025, month: 12 },
    ]
    vi.mocked(prisma.budgetPlan.findMany).mockResolvedValue(plans as any)

    const res = await GET(makeReq("http://localhost:3000/api/budgeting/plans"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(plans)
    expect(prisma.budgetPlan.findMany).toHaveBeenCalledWith({
      where: { organizationId: ORG },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })
  })

  it("returns empty array when no plans exist", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findMany).mockResolvedValue([])

    const res = await GET(makeReq("http://localhost:3000/api/budgeting/plans"))
    const json = await res.json()
    expect(json.data).toEqual([])
  })
})

/* ───────────── POST /api/budgeting/plans ───────────── */

describe("POST /api/budgeting/plans", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await POST(jsonReq({ name: "Test", periodType: "annual", year: 2026 }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const req = makeReq("http://localhost:3000/api/budgeting/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json{{{",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid JSON")
  })

  it("returns 400 when name is empty", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq({ name: "", periodType: "annual", year: 2026 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Validation failed")
    expect(json.details.name).toBeDefined()
  })

  it("returns 400 when periodType is invalid enum value", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq({ name: "Test", periodType: "biweekly", year: 2026 }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Validation failed")
  })

  it("returns 400 when year is below 2020", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq({ name: "Test", periodType: "annual", year: 2019 }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when year exceeds 2050", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq({ name: "Test", periodType: "annual", year: 2051 }))
    expect(res.status).toBe(400)
  })

  it("rejects unknown fields due to strict schema", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq({ name: "Test", periodType: "annual", year: 2026, hackerField: true }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Validation failed")
  })

  it("returns 409 when a duplicate plan exists for the same period", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "dup-1", name: "Existing Plan" } as any)

    const res = await POST(jsonReq({ name: "New Plan", periodType: "annual", year: 2026 }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toContain("Existing Plan")
  })

  it("creates plan and returns 201 on valid input", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const createdPlan = { id: "new-1", name: "Q1 Budget", periodType: "quarterly", year: 2026, quarter: 1 }
    vi.mocked(prisma.budgetPlan.create).mockResolvedValue(createdPlan as any)

    const res = await POST(jsonReq({ name: "Q1 Budget", periodType: "quarterly", year: 2026, quarter: 1 }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("new-1")
  })

  it("creates plan with optional notes and month fields", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const createdPlan = { id: "m-1", name: "Jan 2026", periodType: "monthly", year: 2026, month: 1, notes: "Test note" }
    vi.mocked(prisma.budgetPlan.create).mockResolvedValue(createdPlan as any)

    const res = await POST(jsonReq({ name: "Jan 2026", periodType: "monthly", year: 2026, month: 1, notes: "Test note" }))
    expect(res.status).toBe(201)
    expect(prisma.budgetPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: ORG,
        name: "Jan 2026",
        periodType: "monthly",
        year: 2026,
        month: 1,
        notes: "Test note",
      }),
    })
  })

  it("auto-populates lines from source plan when one exists", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    // First findFirst: duplicate check → null
    // Second findFirst: source plan lookup
    vi.mocked(prisma.budgetPlan.findFirst)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "source-1", organizationId: ORG } as any)

    const createdPlan = { id: "new-plan", name: "Annual 2026", periodType: "annual", year: 2026 }
    vi.mocked(prisma.budgetPlan.create).mockResolvedValue(createdPlan as any)

    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([
      { id: "sl-1", category: "Daimi IT", lineType: "revenue", parentId: null, costModelKey: null, plannedAmount: 1000, notes: null, sortOrder: 0, lineSubtype: null },
    ] as any)
    vi.mocked(prisma.salesForecast.findMany).mockResolvedValue([])
    vi.mocked(prisma.budgetLine.create).mockResolvedValue({ id: "cloned-1" } as any)

    const res = await POST(jsonReq({ name: "Annual 2026", periodType: "annual", year: 2026 }))
    expect(res.status).toBe(201)
    expect(prisma.budgetLine.create).toHaveBeenCalled()
  })
})
