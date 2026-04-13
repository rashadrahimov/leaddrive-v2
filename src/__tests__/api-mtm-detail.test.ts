import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mtmRoute: { findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
    mtmRoutePoint: { deleteMany: vi.fn(), createMany: vi.fn() },
    mtmVisit: { findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
    mtmOrder: { findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    mtmPhoto: { findFirst: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
    mtmAlert: { updateMany: vi.fn(), deleteMany: vi.fn() },
    mtmAuditLog: { findMany: vi.fn(), count: vi.fn() },
    mtmAgentLocation: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
    mtmAgent: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    mtmTask: { count: vi.fn() },
    mtmRoute2: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/mobile-auth", () => ({
  requireMobileAuth: vi.fn(),
}))

vi.mock("@/lib/geo-utils", () => ({
  calculateDistance: vi.fn(() => 150),
}))

import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { requireMobileAuth } from "@/lib/mobile-auth"

const ORG = "org-1"

function makeReq(url: string, method = "GET"): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), { method })
}

function makeJsonReq(url: string, body: unknown, method = "PUT"): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Routes [id]
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/mtm/routes/[id]", () => {
  let GET: typeof import("@/app/api/v1/mtm/routes/[id]/route").GET
  beforeEach(async () => {
    GET = (await import("@/app/api/v1/mtm/routes/[id]/route")).GET
  })

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/routes/r1"), params("r1"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when route not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findFirst).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/routes/r1"), params("r1"))
    expect(res.status).toBe(404)
  })

  it("returns route with distance annotations", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.findFirst).mockResolvedValue({
      id: "r1", organizationId: ORG,
      points: [{ id: "p1", customer: { latitude: 40.4, longitude: 49.8 } }],
    } as any)

    const res = await GET(makeReq("/api/v1/mtm/routes/r1?latitude=40.5&longitude=49.9"), params("r1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.points[0].distanceMeters).toBe(150)
  })
})

describe("PUT /api/v1/mtm/routes/[id]", () => {
  let PUT: typeof import("@/app/api/v1/mtm/routes/[id]/route").PUT
  beforeEach(async () => {
    PUT = (await import("@/app/api/v1/mtm/routes/[id]/route")).PUT
  })

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await PUT(makeJsonReq("/api/v1/mtm/routes/r1", { agentId: "a1", date: "2026-04-10" }), params("r1"))
    expect(res.status).toBe(401)
  })

  it("updates route and replaces points", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoute.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.mtmRoutePoint.deleteMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.mtmRoutePoint.createMany).mockResolvedValue({ count: 2 } as any)

    const res = await PUT(
      makeJsonReq("/api/v1/mtm/routes/r1", { agentId: "a1", date: "2026-04-10", points: [{ customerId: "c1" }, { customerId: "c2" }] }),
      params("r1"),
    )
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.mtmRoutePoint.createMany).toHaveBeenCalled()
  })
})

describe("DELETE /api/v1/mtm/routes/[id]", () => {
  let DELETE: typeof import("@/app/api/v1/mtm/routes/[id]/route").DELETE
  beforeEach(async () => {
    DELETE = (await import("@/app/api/v1/mtm/routes/[id]/route")).DELETE
  })

  it("returns 404 when route not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoutePoint.deleteMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.mtmRoute.deleteMany).mockResolvedValue({ count: 0 } as any)
    const res = await DELETE(makeReq("/api/v1/mtm/routes/r1", "DELETE"), params("r1"))
    expect(res.status).toBe(404)
  })

  it("deletes route and its points", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmRoutePoint.deleteMany).mockResolvedValue({ count: 2 } as any)
    vi.mocked(prisma.mtmRoute.deleteMany).mockResolvedValue({ count: 1 } as any)
    const res = await DELETE(makeReq("/api/v1/mtm/routes/r1", "DELETE"), params("r1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Visits [id]
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/mtm/visits/[id]", () => {
  let GET: typeof import("@/app/api/v1/mtm/visits/[id]/route").GET
  beforeEach(async () => { GET = (await import("@/app/api/v1/mtm/visits/[id]/route")).GET })

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/visits/v1"), params("v1"))
    expect(res.status).toBe(401)
  })

  it("returns visit data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.findFirst).mockResolvedValue({ id: "v1", agent: { name: "Agent" }, customer: { name: "Customer" } } as any)
    const res = await GET(makeReq("/api/v1/mtm/visits/v1"), params("v1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("v1")
  })
})

describe("PUT /api/v1/mtm/visits/[id]", () => {
  let PUT: typeof import("@/app/api/v1/mtm/visits/[id]/route").PUT
  beforeEach(async () => { PUT = (await import("@/app/api/v1/mtm/visits/[id]/route")).PUT })

  it("updates visit and auto-sets checkOutAt on CHECKED_OUT", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.updateMany).mockResolvedValue({ count: 1 } as any)
    const res = await PUT(
      makeJsonReq("/api/v1/mtm/visits/v1", { agentId: "a1", customerId: "c1", status: "CHECKED_OUT" }),
      params("v1"),
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe("DELETE /api/v1/mtm/visits/[id]", () => {
  let DELETE: typeof import("@/app/api/v1/mtm/visits/[id]/route").DELETE
  beforeEach(async () => { DELETE = (await import("@/app/api/v1/mtm/visits/[id]/route")).DELETE })

  it("returns 404 when not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.deleteMany).mockResolvedValue({ count: 0 } as any)
    const res = await DELETE(makeReq("/api/v1/mtm/visits/v1", "DELETE"), params("v1"))
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Orders [id]
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/mtm/orders/[id]", () => {
  let GET: typeof import("@/app/api/v1/mtm/orders/[id]/route").GET
  beforeEach(async () => { GET = (await import("@/app/api/v1/mtm/orders/[id]/route")).GET })

  it("returns 404 when order not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findFirst).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/orders/o1"), params("o1"))
    expect(res.status).toBe(404)
  })

  it("returns order data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findFirst).mockResolvedValue({ id: "o1", items: "[]", totalAmount: 100 } as any)
    const res = await GET(makeReq("/api/v1/mtm/orders/o1"), params("o1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

describe("PUT /api/v1/mtm/orders/[id]", () => {
  let PUT: typeof import("@/app/api/v1/mtm/orders/[id]/route").PUT
  beforeEach(async () => { PUT = (await import("@/app/api/v1/mtm/orders/[id]/route")).PUT })

  it("updates order and calculates totalAmount", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.updateMany).mockResolvedValue({ count: 1 } as any)
    const res = await PUT(
      makeJsonReq("/api/v1/mtm/orders/o1", { agentId: "a1", customerId: "c1", items: [{ price: "10", qty: "3" }] }),
      params("o1"),
    )
    const json = await res.json()
    expect(json.success).toBe(true)
    const call = vi.mocked(prisma.mtmOrder.updateMany).mock.calls[0][0] as any
    expect(call.data.totalAmount).toBe(30)
  })
})

describe("DELETE /api/v1/mtm/orders/[id]", () => {
  let DELETE: typeof import("@/app/api/v1/mtm/orders/[id]/route").DELETE
  beforeEach(async () => { DELETE = (await import("@/app/api/v1/mtm/orders/[id]/route")).DELETE })

  it("deletes order", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.deleteMany).mockResolvedValue({ count: 1 } as any)
    const res = await DELETE(makeReq("/api/v1/mtm/orders/o1", "DELETE"), params("o1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Photos [id] (PATCH + DELETE)
// ═══════════════════════════════════════════════════════════════════════════

describe("PATCH /api/v1/mtm/photos/[id]", () => {
  let PATCH: typeof import("@/app/api/v1/mtm/photos/[id]/route").PATCH
  beforeEach(async () => { PATCH = (await import("@/app/api/v1/mtm/photos/[id]/route")).PATCH })

  it("returns 404 when photo not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmPhoto.findFirst).mockResolvedValue(null)
    const req = makeJsonReq("/api/v1/mtm/photos/ph1", { status: "APPROVED" }, "PATCH")
    const res = await PATCH(req, params("ph1"))
    expect(res.status).toBe(404)
  })

  it("updates photo status with reviewedAt", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmPhoto.findFirst).mockResolvedValue({ id: "ph1" } as any)
    vi.mocked(prisma.mtmPhoto.update).mockResolvedValue({ id: "ph1", status: "APPROVED" } as any)
    const req = makeJsonReq("/api/v1/mtm/photos/ph1", { status: "APPROVED", reviewedBy: "user-1" }, "PATCH")
    const res = await PATCH(req, params("ph1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    const call = vi.mocked(prisma.mtmPhoto.update).mock.calls[0][0] as any
    expect(call.data.reviewedAt).toBeInstanceOf(Date)
  })
})

describe("DELETE /api/v1/mtm/photos/[id]", () => {
  let DELETE: typeof import("@/app/api/v1/mtm/photos/[id]/route").DELETE
  beforeEach(async () => { DELETE = (await import("@/app/api/v1/mtm/photos/[id]/route")).DELETE })

  it("returns 404 when photo not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmPhoto.deleteMany).mockResolvedValue({ count: 0 } as any)
    const res = await DELETE(makeReq("/api/v1/mtm/photos/ph1", "DELETE"), params("ph1"))
    expect(res.status).toBe(404)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Alerts [id] (PATCH + DELETE)
// ═══════════════════════════════════════════════════════════════════════════

describe("PATCH /api/v1/mtm/alerts/[id]", () => {
  let PATCH: typeof import("@/app/api/v1/mtm/alerts/[id]/route").PATCH
  beforeEach(async () => { PATCH = (await import("@/app/api/v1/mtm/alerts/[id]/route")).PATCH })

  it("resolves alert with resolvedAt timestamp", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAlert.updateMany).mockResolvedValue({ count: 1 } as any)
    const req = makeJsonReq("/api/v1/mtm/alerts/al1", { isResolved: true, resolvedBy: "user-1" }, "PATCH")
    const res = await PATCH(req, params("al1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    const call = vi.mocked(prisma.mtmAlert.updateMany).mock.calls[0][0] as any
    expect(call.data.resolvedAt).toBeInstanceOf(Date)
  })

  it("returns 404 when alert not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAlert.updateMany).mockResolvedValue({ count: 0 } as any)
    const req = makeJsonReq("/api/v1/mtm/alerts/al1", { isResolved: true }, "PATCH")
    const res = await PATCH(req, params("al1"))
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/v1/mtm/alerts/[id]", () => {
  let DELETE: typeof import("@/app/api/v1/mtm/alerts/[id]/route").DELETE
  beforeEach(async () => { DELETE = (await import("@/app/api/v1/mtm/alerts/[id]/route")).DELETE })

  it("deletes alert", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAlert.deleteMany).mockResolvedValue({ count: 1 } as any)
    const res = await DELETE(makeReq("/api/v1/mtm/alerts/al1", "DELETE"), params("al1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Activity (GET)
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/mtm/activity", () => {
  let GET: typeof import("@/app/api/v1/mtm/activity/route").GET
  beforeEach(async () => { GET = (await import("@/app/api/v1/mtm/activity/route")).GET })

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/activity"))
    expect(res.status).toBe(401)
  })

  it("returns KPI counts and activity logs", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(5)
    vi.mocked(prisma.mtmPhoto.count).mockResolvedValue(3)
    vi.mocked(prisma.mtmAuditLog.count).mockResolvedValue(10)
    vi.mocked(prisma.mtmAuditLog.findMany).mockResolvedValue([])
    const res = await GET(makeReq("/api/v1/mtm/activity"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.kpi).toBeDefined()
    expect(json.data.logs).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Locations (GET + POST)
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/mtm/locations", () => {
  let GET: typeof import("@/app/api/v1/mtm/locations/route").GET
  beforeEach(async () => { GET = (await import("@/app/api/v1/mtm/locations/route")).GET })

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/locations"))
    expect(res.status).toBe(401)
  })

  it("returns single agent history when agentId provided", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgentLocation.findMany).mockResolvedValue([{ id: "loc1", latitude: 40.4 }] as any)
    const res = await GET(makeReq("/api/v1/mtm/locations?agentId=agent-1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.locations).toHaveLength(1)
  })
})

describe("POST /api/v1/mtm/locations", () => {
  let POST: typeof import("@/app/api/v1/mtm/locations/route").POST
  beforeEach(async () => { POST = (await import("@/app/api/v1/mtm/locations/route")).POST })

  it("creates location and updates agent status", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAgentLocation.create).mockResolvedValue({ id: "loc-new" } as any)
    vi.mocked(prisma.mtmAgent.update).mockResolvedValue({} as any)
    const req = makeJsonReq("/api/v1/mtm/locations", { agentId: "a1", latitude: "40.4", longitude: "49.8" }, "POST")
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(prisma.mtmAgent.update).toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Mobile Location (POST + GET)
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/v1/mtm/mobile/location", () => {
  let POST: typeof import("@/app/api/v1/mtm/mobile/location/route").POST
  beforeEach(async () => { POST = (await import("@/app/api/v1/mtm/mobile/location/route")).POST })

  it("returns 401 when mobile auth fails", async () => {
    const { NextResponse: NR } = await import("next/server")
    vi.mocked(requireMobileAuth).mockReturnValue(NR.json({ error: "Unauthorized" }, { status: 401 }))
    const req = makeJsonReq("/api/v1/mtm/mobile/location", { latitude: 40.4, longitude: 49.8 }, "POST")
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 400 when lat/lng missing", async () => {
    vi.mocked(requireMobileAuth).mockReturnValue({ orgId: ORG, agentId: "a1" } as any)
    const req = makeJsonReq("/api/v1/mtm/mobile/location", {}, "POST")
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("saves location successfully", async () => {
    vi.mocked(requireMobileAuth).mockReturnValue({ orgId: ORG, agentId: "a1" } as any)
    vi.mocked(prisma.mtmAgentLocation.create).mockResolvedValue({} as any)
    vi.mocked(prisma.mtmAgent.update).mockResolvedValue({} as any)
    const req = makeJsonReq("/api/v1/mtm/mobile/location", { latitude: 40.4, longitude: 49.8, speed: 5 }, "POST")
    const res = await POST(req)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Mobile Profile (GET)
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/mtm/mobile/profile", () => {
  let GET: typeof import("@/app/api/v1/mtm/mobile/profile/route").GET
  beforeEach(async () => { GET = (await import("@/app/api/v1/mtm/mobile/profile/route")).GET })

  it("returns 401 when mobile auth fails", async () => {
    const { NextResponse: NR } = await import("next/server")
    vi.mocked(requireMobileAuth).mockReturnValue(NR.json({ error: "Unauthorized" }, { status: 401 }))
    const res = await GET(makeReq("/api/v1/mtm/mobile/profile"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when agent not found", async () => {
    vi.mocked(requireMobileAuth).mockReturnValue({ orgId: ORG, agentId: "a1" } as any)
    vi.mocked(prisma.mtmAgent.findUnique).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/mobile/profile"))
    expect(res.status).toBe(404)
  })

  it("returns agent profile with today summary", async () => {
    vi.mocked(requireMobileAuth).mockReturnValue({ orgId: ORG, agentId: "a1" } as any)
    vi.mocked(prisma.mtmAgent.findUnique).mockResolvedValue({
      id: "a1", name: "Agent", email: "a@test.com", phone: "+1", role: "FIELD", status: "ACTIVE",
      avatar: null, isOnline: true, organizationId: ORG,
      organization: { id: ORG, name: "TestOrg" }, manager: null,
    } as any)
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(3)
    vi.mocked(prisma.mtmTask.count).mockResolvedValue(2)
    vi.mocked(prisma.mtmRoute.findFirst).mockResolvedValue({ totalPoints: 5, visitedPoints: 3, status: "IN_PROGRESS" } as any)

    const res = await GET(makeReq("/api/v1/mtm/mobile/profile"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.agent.name).toBe("Agent")
    expect(json.data.todaySummary.visits).toBe(3)
    expect(json.data.todaySummary.tasksCompleted).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// MTM Reports (GET)
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/v1/mtm/reports", () => {
  let GET: typeof import("@/app/api/v1/mtm/reports/route").GET
  beforeEach(async () => { GET = (await import("@/app/api/v1/mtm/reports/route")).GET })

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/reports"))
    expect(res.status).toBe(401)
  })

  it("returns report counts with default period=week", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAuditLog.count).mockResolvedValue(10)
    vi.mocked(prisma.mtmAgent.count).mockResolvedValue(5)
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(8)
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(20)
    vi.mocked(prisma.mtmAgentLocation.count).mockResolvedValue(100)
    vi.mocked(prisma.mtmPhoto.count).mockResolvedValue(15)

    const res = await GET(makeReq("/api/v1/mtm/reports"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.counts.agent).toBe(5)
    expect(json.data.counts.visit).toBe(20)
    expect(json.data.period).toBe("week")
    expect(json.data.reportData).toBeNull()
  })

  it("returns detailed data when type=daily", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAuditLog.count).mockResolvedValue(10)
    vi.mocked(prisma.mtmAgent.count).mockResolvedValue(5)
    vi.mocked(prisma.mtmRoute.count).mockResolvedValue(8)
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(20)
    vi.mocked(prisma.mtmAgentLocation.count).mockResolvedValue(100)
    vi.mocked(prisma.mtmPhoto.count).mockResolvedValue(15)
    vi.mocked(prisma.mtmAuditLog.findMany).mockResolvedValue([{ id: "log1", action: "VISIT_CHECK_IN" }] as any)

    const res = await GET(makeReq("/api/v1/mtm/reports?type=daily&period=today"))
    const json = await res.json()
    expect(json.data.type).toBe("daily")
    expect(json.data.period).toBe("today")
    expect(json.data.reportData).toHaveLength(1)
  })
})
