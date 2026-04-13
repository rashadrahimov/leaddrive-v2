import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mtmRoute: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

import { GET, POST } from "@/app/api/v1/mtm/routes/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const ORG = "org-1"

const sampleRoute = {
  id: "route-1",
  organizationId: ORG,
  agentId: "agent-1",
  date: new Date("2026-04-10"),
  name: "Morning Run",
  notes: null,
  totalPoints: 2,
  visitedPoints: 0,
  status: "PLANNED",
  agent: { id: "agent-1", name: "John" },
  points: [
    { id: "p1", orderIndex: 0, customer: { id: "c1", name: "Customer A", address: "Main St" } },
    { id: "p2", orderIndex: 1, customer: { id: "c2", name: "Customer B", address: "2nd Ave" } },
  ],
}

function makeReq(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

function makePostReq(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/v1/mtm/routes"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/v1/mtm/routes ─────────────────────────────────
describe("GET /api/v1/mtm/routes", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/routes"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns paginated routes", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findMany).mockResolvedValue([sampleRoute] as any)
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(1)

    const res = await GET(makeReq("/api/v1/mtm/routes"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.routes).toHaveLength(1)
    expect(json.data.total).toBe(1)
    expect(json.data.page).toBe(1)
    expect(json.data.limit).toBe(50)
  })

  it("filters by agentId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/routes?agentId=agent-1"))

    const callArgs = vi.mocked(prisma.mtmRoute.findMany).mock.calls[0][0] as any
    expect(callArgs.where.agentId).toBe("agent-1")
  })

  it("filters by status", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/routes?status=COMPLETED"))

    const callArgs = vi.mocked(prisma.mtmRoute.findMany).mock.calls[0][0] as any
    expect(callArgs.where.status).toBe("COMPLETED")
  })

  it("filters by date with day range", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/routes?date=2026-04-10"))

    const callArgs = vi.mocked(prisma.mtmRoute.findMany).mock.calls[0][0] as any
    expect(callArgs.where.date.gte).toEqual(new Date("2026-04-10"))
    expect(callArgs.where.date.lt).toEqual(new Date("2026-04-11"))
  })

  it("respects page and limit params", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(100)

    const res = await GET(makeReq("/api/v1/mtm/routes?page=3&limit=10"))
    const json = await res.json()
    expect(json.data.page).toBe(3)
    expect(json.data.limit).toBe(10)

    const callArgs = vi.mocked(prisma.mtmRoute.findMany).mock.calls[0][0] as any
    expect(callArgs.skip).toBe(20) // (3-1)*10
    expect(callArgs.take).toBe(10)
  })

  it("clamps limit to max 200", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/routes?limit=999"))

    const callArgs = vi.mocked(prisma.mtmRoute.findMany).mock.calls[0][0] as any
    expect(callArgs.take).toBe(200)
  })

  it("returns empty array on prisma error", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findMany).mockRejectedValue(new Error("DB error"))

    const res = await GET(makeReq("/api/v1/mtm/routes"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.routes).toEqual([])
    expect(json.data.total).toBe(0)
  })
})

// ─── POST /api/v1/mtm/routes ────────────────────────────────
describe("POST /api/v1/mtm/routes", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await POST(makePostReq({ agentId: "a1", date: "2026-04-10" }))
    expect(res.status).toBe(401)
  })

  it("creates a route with points and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.create).mockResolvedValue({ id: "new-route", ...sampleRoute } as any)

    const body = {
      agentId: "agent-1",
      date: "2026-04-10",
      name: "Morning Run",
      points: [
        { customerId: "c1", plannedTime: "2026-04-10T09:00:00Z" },
        { customerId: "c2" },
      ],
    }

    const res = await POST(makePostReq(body))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)

    const createArgs = vi.mocked(prisma.mtmRoute.create).mock.calls[0][0] as any
    expect(createArgs.data.organizationId).toBe(ORG)
    expect(createArgs.data.agentId).toBe("agent-1")
    expect(createArgs.data.totalPoints).toBe(2)
    expect(createArgs.data.points.create).toHaveLength(2)
    expect(createArgs.data.points.create[0].orderIndex).toBe(0)
    expect(createArgs.data.points.create[1].orderIndex).toBe(1)
  })

  it("creates a route without points", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.create).mockResolvedValue({ id: "r2" } as any)

    const body = { agentId: "agent-1", date: "2026-04-10" }
    const res = await POST(makePostReq(body))
    expect(res.status).toBe(201)

    const createArgs = vi.mocked(prisma.mtmRoute.create).mock.calls[0][0] as any
    expect(createArgs.data.totalPoints).toBe(0)
    expect(createArgs.data.points).toBeUndefined()
  })

  it("returns 400 on create failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.create).mockRejectedValue(new Error("FK violation"))

    const res = await POST(makePostReq({ agentId: "bad", date: "2026-04-10" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("FK violation")
  })
})
