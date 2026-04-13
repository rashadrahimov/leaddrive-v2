import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    contact: { count: vi.fn() },
    deal: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    lead: { count: vi.fn(), groupBy: vi.fn() },
    task: { count: vi.fn(), groupBy: vi.fn() },
    ticket: { count: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn() },
    contract: { findMany: vi.fn() },
    savedReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    journey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    journeyStep: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/constants", () => ({ DEFAULT_CURRENCY: "AZN", PAGE_SIZE: { EXPORT: 1000 } }))

import { GET as GET_REPORTS } from "@/app/api/v1/reports/route"
import { GET as GET_BUILDER, POST as POST_BUILDER } from "@/app/api/v1/reports/builder/route"
import { GET as GET_REPORT_BY_ID, PUT as PUT_REPORT, DELETE as DELETE_REPORT } from "@/app/api/v1/reports/builder/[id]/route"
import { GET as GET_JOURNEYS, POST as POST_JOURNEY } from "@/app/api/v1/journeys/route"
import { GET as GET_JOURNEY_BY_ID, PUT as PUT_JOURNEY, DELETE as DELETE_JOURNEY } from "@/app/api/v1/journeys/[id]/route"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getOrgId).mockResolvedValue("org-1")
  vi.mocked(getSession).mockResolvedValue({ orgId: "org-1", userId: "user-1", role: "admin", email: "a@b.com", name: "Test" } as any)
})

// ─── GET /api/v1/reports ────────────────────────────────────────────

describe("GET /api/v1/reports", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await GET_REPORTS(makeReq("http://localhost:3000/api/v1/reports"))
    expect(res.status).toBe(401)
  })

  it("returns report overview with all sections", async () => {
    vi.mocked(prisma.company.count).mockResolvedValue(10)
    vi.mocked(prisma.contact.count).mockResolvedValue(50)
    vi.mocked(prisma.deal.count).mockResolvedValue(5)
    vi.mocked(prisma.lead.count).mockResolvedValue(20)
    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(15)   // total tasks
      .mockResolvedValueOnce(3)    // overdue tasks
    vi.mocked(prisma.ticket.count)
      .mockResolvedValueOnce(10)   // total tickets
      .mockResolvedValueOnce(4)    // open tickets
    vi.mocked(prisma.deal.findMany).mockResolvedValue([
      { valueAmount: 5000 },
      { valueAmount: 3000 },
    ] as any)
    vi.mocked(prisma.deal.groupBy).mockResolvedValue([
      { stage: "LEAD", _count: 3, _sum: { valueAmount: 3000 } },
    ] as any)
    vi.mocked(prisma.task.groupBy).mockResolvedValue([
      { status: "completed", _count: 5 },
      { status: "in_progress", _count: 10 },
    ] as any)
    vi.mocked(prisma.ticket.groupBy).mockResolvedValue([
      { status: "resolved", _count: 3 },
      { status: "closed", _count: 2 },
      { status: "new", _count: 5 },
    ] as any)
    vi.mocked(prisma.lead.groupBy).mockResolvedValue([
      { status: "new", _count: 15 },
      { status: "converted", _count: 5 },
    ] as any)
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { name: "Acme", contracts: [{ valueAmount: 10000 }] },
    ] as any)
    vi.mocked(prisma.company.groupBy).mockResolvedValue([
      { leadStatus: "active", _count: 8 },
    ] as any)
    vi.mocked(prisma.ticket.aggregate).mockResolvedValue({
      _avg: { satisfactionRating: 4.2 },
      _count: { satisfactionRating: 10 },
    } as any)
    vi.mocked(prisma.contract.findMany).mockResolvedValue([
      { valueAmount: 5000, status: "active" },
      { valueAmount: 2000, status: "expired" },
    ] as any)

    const res = await GET_REPORTS(makeReq("http://localhost:3000/api/v1/reports"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.overview.companies).toBe(10)
    expect(json.data.overview.contacts).toBe(50)
    expect(json.data.overview.deals).toBe(5)
    expect(json.data.revenue.totalRevenue).toBe(8000)
    expect(json.data.revenue.wonDealsCount).toBe(2)
    expect(json.data.pipeline.stages).toHaveLength(1)
    expect(json.data.tasks.total).toBe(15)
    expect(json.data.tasks.completionRate).toBe(33) // 5/15 * 100 = 33
    expect(json.data.tickets.resolutionRate).toBe(50) // (3+2)/10 * 100 = 50
    expect(json.data.leads.conversionRate).toBe(25) // 5/20 * 100 = 25
    expect(json.data.csat.average).toBe(4.2)
    expect(json.data.financial.activeContracts).toBe(1)
  })

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.company.count).mockRejectedValue(new Error("DB down"))
    const res = await GET_REPORTS(makeReq("http://localhost:3000/api/v1/reports"))
    expect(res.status).toBe(500)
  })
})

// ─── GET /api/v1/reports/builder ────────────────────────────────────

describe("GET /api/v1/reports/builder", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await GET_BUILDER(makeReq("http://localhost:3000/api/v1/reports/builder"))
    expect(res.status).toBe(401)
  })

  it("returns saved reports with pagination", async () => {
    vi.mocked(prisma.savedReport.findMany).mockResolvedValue([
      { id: "r1", name: "Report A" },
    ] as any)
    vi.mocked(prisma.savedReport.count).mockResolvedValue(1)

    const res = await GET_BUILDER(makeReq("http://localhost:3000/api/v1/reports/builder?page=1&limit=20"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
    expect(json.pagination.page).toBe(1)
  })
})

// ─── POST /api/v1/reports/builder ───────────────────────────────────

describe("POST /api/v1/reports/builder", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await POST_BUILDER(makeReq("http://localhost:3000/api/v1/reports/builder", {
      method: "POST",
      body: JSON.stringify({ name: "Test", entityType: "deals", columns: ["name"] }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 401 when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    const res = await POST_BUILDER(makeReq("http://localhost:3000/api/v1/reports/builder", {
      method: "POST",
      body: JSON.stringify({ name: "Test", entityType: "deals", columns: ["name"] }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 400 on invalid JSON body", async () => {
    const res = await POST_BUILDER(new NextRequest(
      new URL("http://localhost:3000/api/v1/reports/builder"),
      { method: "POST", body: "not json" },
    ))
    expect(res.status).toBe(400)
  })

  it("creates a report and returns 201", async () => {
    const created = { id: "r-new", name: "Sales Report", entityType: "deals", columns: ["name", "value"] }
    vi.mocked(prisma.savedReport.create).mockResolvedValue(created as any)

    const res = await POST_BUILDER(makeReq("http://localhost:3000/api/v1/reports/builder", {
      method: "POST",
      body: JSON.stringify({ name: "Sales Report", entityType: "deals", columns: ["name", "value"] }),
    }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("Sales Report")
  })

  it("updates existing report when id is provided in body", async () => {
    vi.mocked(prisma.savedReport.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.savedReport.findUnique).mockResolvedValue({ id: "r1", name: "Updated" } as any)

    const res = await POST_BUILDER(makeReq("http://localhost:3000/api/v1/reports/builder", {
      method: "POST",
      body: JSON.stringify({ id: "r1", name: "Updated" }),
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.name).toBe("Updated")
  })

  it("returns 400 when validation fails (missing entityType)", async () => {
    const res = await POST_BUILDER(makeReq("http://localhost:3000/api/v1/reports/builder", {
      method: "POST",
      body: JSON.stringify({ name: "Bad Report", columns: ["name"] }),
    }))
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/v1/reports/builder/:id ────────────────────────────────

describe("GET /api/v1/reports/builder/:id", () => {
  it("returns 404 when not found", async () => {
    vi.mocked(prisma.savedReport.findFirst).mockResolvedValue(null)
    const res = await GET_REPORT_BY_ID(makeReq("http://localhost:3000/api/v1/reports/builder/missing"), makeParams("missing"))
    expect(res.status).toBe(404)
  })

  it("returns report by id", async () => {
    vi.mocked(prisma.savedReport.findFirst).mockResolvedValue({ id: "r1", name: "My Report" } as any)
    const res = await GET_REPORT_BY_ID(makeReq("http://localhost:3000/api/v1/reports/builder/r1"), makeParams("r1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("r1")
  })
})

// ─── PUT /api/v1/reports/builder/:id ────────────────────────────────

describe("PUT /api/v1/reports/builder/:id", () => {
  it("returns 404 when report not found", async () => {
    vi.mocked(prisma.savedReport.findFirst).mockResolvedValue(null)
    const res = await PUT_REPORT(
      makeReq("http://localhost:3000/api/v1/reports/builder/missing", { method: "PUT", body: JSON.stringify({ name: "X" }) }),
      makeParams("missing"),
    )
    expect(res.status).toBe(404)
  })

  it("updates report and returns updated data", async () => {
    vi.mocked(prisma.savedReport.findFirst).mockResolvedValue({ id: "r1" } as any)
    vi.mocked(prisma.savedReport.update).mockResolvedValue({ id: "r1", name: "Updated Report", chartType: "bar" } as any)

    const res = await PUT_REPORT(
      makeReq("http://localhost:3000/api/v1/reports/builder/r1", { method: "PUT", body: JSON.stringify({ name: "Updated Report", chartType: "bar" }) }),
      makeParams("r1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("Updated Report")
  })

  it("returns 400 on invalid JSON", async () => {
    const res = await PUT_REPORT(
      new NextRequest(new URL("http://localhost:3000/api/v1/reports/builder/r1"), { method: "PUT", body: "bad json" }),
      makeParams("r1"),
    )
    expect(res.status).toBe(400)
  })
})

// ─── DELETE /api/v1/reports/builder/:id ─────────────────────────────

describe("DELETE /api/v1/reports/builder/:id", () => {
  it("returns 404 when report not found", async () => {
    vi.mocked(prisma.savedReport.findFirst).mockResolvedValue(null)
    const res = await DELETE_REPORT(
      makeReq("http://localhost:3000/api/v1/reports/builder/missing", { method: "DELETE" }),
      makeParams("missing"),
    )
    expect(res.status).toBe(404)
  })

  it("deletes report and returns success", async () => {
    vi.mocked(prisma.savedReport.findFirst).mockResolvedValue({ id: "r1" } as any)
    vi.mocked(prisma.savedReport.delete).mockResolvedValue({ id: "r1" } as any)

    const res = await DELETE_REPORT(
      makeReq("http://localhost:3000/api/v1/reports/builder/r1", { method: "DELETE" }),
      makeParams("r1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.deleted).toBe(true)
  })
})

// ─── GET /api/v1/journeys ───────────────────────────────────────────

describe("GET /api/v1/journeys", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await GET_JOURNEYS(makeReq("http://localhost:3000/api/v1/journeys"))
    expect(res.status).toBe(401)
  })

  it("returns journeys with pagination", async () => {
    vi.mocked(prisma.journey.findMany).mockResolvedValue([
      { id: "j1", name: "Welcome", steps: [] },
    ] as any)
    vi.mocked(prisma.journey.count).mockResolvedValue(1)

    const res = await GET_JOURNEYS(makeReq("http://localhost:3000/api/v1/journeys?page=1&limit=10"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.journeys).toHaveLength(1)
    expect(json.data.total).toBe(1)
  })

  it("passes search filter to where clause", async () => {
    vi.mocked(prisma.journey.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.journey.count).mockResolvedValue(0)

    await GET_JOURNEYS(makeReq("http://localhost:3000/api/v1/journeys?search=onboard"))

    const call = vi.mocked(prisma.journey.findMany).mock.calls[0][0] as any
    expect(call.where.name).toEqual({ contains: "onboard", mode: "insensitive" })
  })

  it("returns empty journeys on DB error (catch returns success:true)", async () => {
    vi.mocked(prisma.journey.findMany).mockRejectedValue(new Error("DB fail"))
    const res = await GET_JOURNEYS(makeReq("http://localhost:3000/api/v1/journeys"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.journeys).toEqual([])
  })
})

// ─── POST /api/v1/journeys ──────────────────────────────────────────

describe("POST /api/v1/journeys", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await POST_JOURNEY(makeReq("http://localhost:3000/api/v1/journeys", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when name is missing", async () => {
    const res = await POST_JOURNEY(makeReq("http://localhost:3000/api/v1/journeys", {
      method: "POST",
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })

  it("creates journey and returns 201", async () => {
    const created = { id: "j-new", name: "Onboarding", status: "draft" }
    vi.mocked(prisma.journey.create).mockResolvedValue(created as any)

    const res = await POST_JOURNEY(makeReq("http://localhost:3000/api/v1/journeys", {
      method: "POST",
      body: JSON.stringify({ name: "Onboarding", status: "draft", triggerType: "segment_entry" }),
    }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("Onboarding")
  })
})

// ─── GET /api/v1/journeys/:id ───────────────────────────────────────

describe("GET /api/v1/journeys/:id", () => {
  it("returns 404 when journey not found", async () => {
    vi.mocked(prisma.journey.findFirst).mockResolvedValue(null)
    const res = await GET_JOURNEY_BY_ID(makeReq("http://localhost:3000/api/v1/journeys/missing"), makeParams("missing"))
    expect(res.status).toBe(404)
  })

  it("returns journey with steps", async () => {
    vi.mocked(prisma.journey.findFirst).mockResolvedValue({
      id: "j1", name: "Welcome", steps: [{ id: "s1", stepType: "email", stepOrder: 0 }],
    } as any)

    const res = await GET_JOURNEY_BY_ID(makeReq("http://localhost:3000/api/v1/journeys/j1"), makeParams("j1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.steps).toHaveLength(1)
  })
})

// ─── PUT /api/v1/journeys/:id ───────────────────────────────────────

describe("PUT /api/v1/journeys/:id", () => {
  it("returns 400 on invalid body (bad status)", async () => {
    const res = await PUT_JOURNEY(
      makeReq("http://localhost:3000/api/v1/journeys/j1", { method: "PUT", body: JSON.stringify({ status: "invalid" }) }),
      makeParams("j1"),
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when updateMany count is 0", async () => {
    vi.mocked(prisma.journey.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await PUT_JOURNEY(
      makeReq("http://localhost:3000/api/v1/journeys/missing", { method: "PUT", body: JSON.stringify({ name: "X" }) }),
      makeParams("missing"),
    )
    expect(res.status).toBe(404)
  })

  it("updates journey with steps replacement", async () => {
    vi.mocked(prisma.journey.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.journeyStep.deleteMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.journeyStep.createMany).mockResolvedValue({ count: 2 } as any)
    vi.mocked(prisma.journey.findFirst).mockResolvedValue({
      id: "j1", name: "Updated Journey", status: "active",
      steps: [
        { id: "s1", stepType: "email", stepOrder: 0 },
        { id: "s2", stepType: "delay", stepOrder: 1 },
      ],
    } as any)

    const res = await PUT_JOURNEY(
      makeReq("http://localhost:3000/api/v1/journeys/j1", {
        method: "PUT",
        body: JSON.stringify({
          name: "Updated Journey",
          status: "active",
          steps: [
            { stepType: "email", stepOrder: 0, config: { templateId: "t1" } },
            { stepType: "delay", stepOrder: 1, config: { days: 3 } },
          ],
        }),
      }),
      makeParams("j1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.steps).toHaveLength(2)

    // Verify old steps deleted then new created
    expect(prisma.journeyStep.deleteMany).toHaveBeenCalledWith({ where: { journeyId: "j1" } })
    expect(prisma.journeyStep.createMany).toHaveBeenCalled()
  })
})

// ─── DELETE /api/v1/journeys/:id ────────────────────────────────────

describe("DELETE /api/v1/journeys/:id", () => {
  it("returns 404 when deleteMany count is 0", async () => {
    vi.mocked(prisma.journey.deleteMany).mockResolvedValue({ count: 0 } as any)

    const res = await DELETE_JOURNEY(
      makeReq("http://localhost:3000/api/v1/journeys/missing", { method: "DELETE" }),
      makeParams("missing"),
    )
    expect(res.status).toBe(404)
  })

  it("deletes journey and returns deleted id", async () => {
    vi.mocked(prisma.journey.deleteMany).mockResolvedValue({ count: 1 } as any)

    const res = await DELETE_JOURNEY(
      makeReq("http://localhost:3000/api/v1/journeys/j1", { method: "DELETE" }),
      makeParams("j1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.deleted).toBe("j1")
  })
})
