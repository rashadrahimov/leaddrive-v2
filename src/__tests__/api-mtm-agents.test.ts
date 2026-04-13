import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mtmAgent: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    mtmRoute: { count: vi.fn() },
    mtmVisit: {
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    mtmAlert: { count: vi.fn() },
    mtmTask: { count: vi.fn(), findMany: vi.fn() },
    mtmCustomer: { count: vi.fn() },
    mtmPhoto: { count: vi.fn(), findMany: vi.fn() },
    mtmAgentLocation: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-pw"), compare: vi.fn() },
}))

import { GET as ListAgents, POST as CreateAgent } from "@/app/api/v1/mtm/agents/route"
import { GET as GetAgent, PUT as UpdateAgent, DELETE as DeleteAgent } from "@/app/api/v1/mtm/agents/[id]/route"
import { GET as GetDashboard } from "@/app/api/v1/mtm/dashboard/route"
import { GET as GetAnalytics } from "@/app/api/v1/mtm/analytics/route"
import { GET as GetLeaderboard } from "@/app/api/v1/mtm/leaderboard/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const ORG = "org-1"

function makeReq(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

function makeJsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/v1/mtm/agents ────────────────────────────────
describe("GET /api/v1/mtm/agents", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await ListAgents(makeReq("/api/v1/mtm/agents"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns paginated agents", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.findMany).mockResolvedValue([{ id: "a1", name: "Agent 1" }] as any)
    vi.mocked(prisma.mtmAgent.count).mockResolvedValue(1)

    const res = await ListAgents(makeReq("/api/v1/mtm/agents"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.agents).toHaveLength(1)
    expect(json.data.total).toBe(1)
    expect(json.data.page).toBe(1)
    expect(json.data.limit).toBe(50)
  })

  it("filters by status and role", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmAgent.count).mockResolvedValue(0)

    await ListAgents(makeReq("/api/v1/mtm/agents?status=ACTIVE&role=MANAGER"))

    const callArgs = vi.mocked(prisma.mtmAgent.findMany).mock.calls[0][0] as any
    expect(callArgs.where.status).toBe("ACTIVE")
    expect(callArgs.where.role).toBe("MANAGER")
  })

  it("returns empty array on prisma error", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.findMany).mockRejectedValue(new Error("DB error"))

    const res = await ListAgents(makeReq("/api/v1/mtm/agents"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.agents).toEqual([])
    expect(json.data.total).toBe(0)
  })
})

// ─── POST /api/v1/mtm/agents ───────────────────────────────
describe("POST /api/v1/mtm/agents", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await CreateAgent(makeJsonReq("/api/v1/mtm/agents", "POST", { name: "A" }))
    expect(res.status).toBe(401)
  })

  it("creates agent with hashed password and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.create).mockResolvedValue({ id: "new-agent", name: "John" } as any)

    const body = { name: "John", email: "john@test.com", password: "secret123", role: "MANAGER" }
    const res = await CreateAgent(makeJsonReq("/api/v1/mtm/agents", "POST", body))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)

    const createArgs = vi.mocked(prisma.mtmAgent.create).mock.calls[0][0] as any
    expect(createArgs.data.organizationId).toBe(ORG)
    expect(createArgs.data.name).toBe("John")
    expect(createArgs.data.passwordHash).toBe("hashed-pw")
    expect(createArgs.data.role).toBe("MANAGER")
  })

  it("returns 400 on create failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.create).mockRejectedValue(new Error("Duplicate email"))

    const res = await CreateAgent(makeJsonReq("/api/v1/mtm/agents", "POST", { name: "X" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Duplicate email")
  })
})

// ─── GET /api/v1/mtm/agents/[id] ───────────────────────────
describe("GET /api/v1/mtm/agents/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GetAgent(makeReq("/api/v1/mtm/agents/a1"), makeParams("a1"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when agent not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.findFirst).mockResolvedValue(null)

    const res = await GetAgent(makeReq("/api/v1/mtm/agents/a1"), makeParams("a1"))
    expect(res.status).toBe(404)
  })

  it("returns agent data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.findFirst).mockResolvedValue({ id: "a1", name: "John" } as any)

    const res = await GetAgent(makeReq("/api/v1/mtm/agents/a1"), makeParams("a1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("John")
  })
})

// ─── PUT /api/v1/mtm/agents/[id] ───────────────────────────
describe("PUT /api/v1/mtm/agents/[id]", () => {
  it("returns 404 when agent not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.updateMany).mockResolvedValue({ count: 0 })

    const res = await UpdateAgent(
      makeJsonReq("/api/v1/mtm/agents/a1", "PUT", { name: "Updated" }),
      makeParams("a1")
    )
    expect(res.status).toBe(404)
  })

  it("updates agent successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.updateMany).mockResolvedValue({ count: 1 })

    const res = await UpdateAgent(
      makeJsonReq("/api/v1/mtm/agents/a1", "PUT", { name: "Updated", status: "INACTIVE" }),
      makeParams("a1")
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ─── DELETE /api/v1/mtm/agents/[id] ────────────────────────
describe("DELETE /api/v1/mtm/agents/[id]", () => {
  it("returns 404 when agent not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.deleteMany).mockResolvedValue({ count: 0 })

    const res = await DeleteAgent(makeReq("/api/v1/mtm/agents/a1"), makeParams("a1"))
    expect(res.status).toBe(404)
  })

  it("deletes agent successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.deleteMany).mockResolvedValue({ count: 1 })

    const res = await DeleteAgent(makeReq("/api/v1/mtm/agents/a1"), makeParams("a1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ─── GET /api/v1/mtm/dashboard ─────────────────────────────
describe("GET /api/v1/mtm/dashboard", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GetDashboard(makeReq("/api/v1/mtm/dashboard"))
    expect(res.status).toBe(401)
  })

  it("returns dashboard stats", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.count).mockResolvedValue(5)
    vi.mocked(prisma.mtmAgent.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(3)
    vi.mocked(prisma.mtmAlert.count).mockResolvedValue(1)
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(10)
    vi.mocked(prisma.mtmVisit.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmVisit.aggregate).mockResolvedValue({ _avg: { duration: 25 } } as any)
    vi.mocked(prisma.mtmCustomer.count).mockResolvedValue(20)
    vi.mocked(prisma.mtmTask.count).mockResolvedValue(4)
    vi.mocked(prisma.mtmAgentLocation.findMany).mockResolvedValue([])

    const res = await GetDashboard(makeReq("/api/v1/mtm/dashboard"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveProperty("totalAgents")
    expect(json.data).toHaveProperty("todayVisits")
    expect(json.data).toHaveProperty("totalCustomers")
    expect(json.data).toHaveProperty("recentVisits")
    expect(json.data).toHaveProperty("avgVisitDuration")
  })
})

// ─── GET /api/v1/mtm/analytics ─────────────────────────────
describe("GET /api/v1/mtm/analytics", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GetAnalytics(makeReq("/api/v1/mtm/analytics"))
    expect(res.status).toBe(401)
  })

  it("returns analytics KPIs and trends", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(50)
    vi.mocked(prisma.mtmTask.count)
      .mockResolvedValueOnce(20) // totalTasks
      .mockResolvedValueOnce(15) // completedTasks
    vi.mocked(prisma.mtmPhoto.count).mockResolvedValue(30)
    vi.mocked(prisma.mtmVisit.findMany)
      .mockResolvedValueOnce([]) // visits for trend
      .mockResolvedValueOnce([]) // recentVisits for weekly comparison
    vi.mocked(prisma.mtmTask.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmVisit.groupBy).mockResolvedValue([])
    vi.mocked(prisma.mtmAgent.findMany).mockResolvedValue([])

    const res = await GetAnalytics(makeReq("/api/v1/mtm/analytics"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.kpi).toHaveProperty("totalVisits")
    expect(json.data.kpi).toHaveProperty("completionRate")
    expect(json.data).toHaveProperty("monthlyTrend")
    expect(json.data).toHaveProperty("weeklyComparison")
    expect(json.data).toHaveProperty("topAgents")
  })
})

// ─── GET /api/v1/mtm/leaderboard ───────────────────────────
describe("GET /api/v1/mtm/leaderboard", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GetLeaderboard(makeReq("/api/v1/mtm/leaderboard"))
    expect(res.status).toBe(401)
  })

  it("returns ranked agents with scores and achievements", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgent.findMany).mockResolvedValue([
      { id: "a1", name: "Agent A" },
      { id: "a2", name: "Agent B" },
    ] as any)
    // For each agent: visits, completedTasks, totalTasks, approvedPhotos, totalPhotos, onTimeRoutes, totalRoutes
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(5)
    vi.mocked(prisma.mtmTask.count).mockResolvedValue(3)
    vi.mocked(prisma.mtmPhoto.count).mockResolvedValue(2)
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(1)
    vi.mocked(prisma.mtmVisit.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmAlert.count).mockResolvedValue(0)

    const res = await GetLeaderboard(makeReq("/api/v1/mtm/leaderboard"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.rankings).toHaveLength(2)
    expect(json.data.rankings[0]).toHaveProperty("rank", 1)
    expect(json.data.rankings[0]).toHaveProperty("score")
    expect(json.data.rankings[0]).toHaveProperty("achievements")
    expect(json.data.period).toBe("monthly")
  })
})
