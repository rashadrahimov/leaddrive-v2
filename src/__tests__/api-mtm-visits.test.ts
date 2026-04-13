import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mtmVisit: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    mtmCustomer: {
      findFirst: vi.fn(),
    },
    mtmSetting: {
      findFirst: vi.fn(),
    },
    mtmAlert: {
      create: vi.fn(),
    },
    mtmRoutePoint: {
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    mtmRoute: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/geo-utils", () => ({
  calculateDistance: vi.fn(),
}))

import { GET, POST } from "@/app/api/v1/mtm/visits/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { calculateDistance } from "@/lib/geo-utils"

const ORG = "org-1"

const sampleVisit = {
  id: "visit-1",
  organizationId: ORG,
  agentId: "agent-1",
  customerId: "cust-1",
  checkInAt: new Date("2026-04-10T10:00:00Z"),
  checkInLat: 40.4093,
  checkInLng: 49.8671,
  notes: null,
  agent: { id: "agent-1", name: "John" },
  customer: { id: "cust-1", name: "Customer A", address: "Main St", latitude: 40.41, longitude: 49.87 },
}

function makeReq(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

function makePostReq(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/v1/mtm/visits"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: no route point auto-update
  vi.mocked(prisma.mtmRoutePoint.findFirst).mockResolvedValue(null)
})

// ─── GET /api/v1/mtm/visits ─────────────────────────────────
describe("GET /api/v1/mtm/visits", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/visits"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns paginated visits", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.findMany).mockResolvedValue([sampleVisit] as any)
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(1)

    const res = await GET(makeReq("/api/v1/mtm/visits"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.visits).toHaveLength(1)
    expect(json.data.total).toBe(1)
  })

  it("filters by agentId and customerId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/visits?agentId=agent-1&customerId=cust-1"))

    const callArgs = vi.mocked(prisma.mtmVisit.findMany).mock.calls[0][0] as any
    expect(callArgs.where.agentId).toBe("agent-1")
    expect(callArgs.where.customerId).toBe("cust-1")
  })

  it("filters by from/to date range", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmVisit.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/visits?from=2026-04-01&to=2026-04-30"))

    const callArgs = vi.mocked(prisma.mtmVisit.findMany).mock.calls[0][0] as any
    expect(callArgs.where.checkInAt.gte).toEqual(new Date("2026-04-01"))
    expect(callArgs.where.checkInAt.lte).toEqual(new Date("2026-04-30"))
  })

  it("returns empty array on prisma error", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.findMany).mockRejectedValue(new Error("DB error"))

    const res = await GET(makeReq("/api/v1/mtm/visits"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.visits).toEqual([])
    expect(json.data.total).toBe(0)
  })
})

// ─── POST /api/v1/mtm/visits ────────────────────────────────
describe("POST /api/v1/mtm/visits", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await POST(makePostReq({ agentId: "a1", customerId: "c1" }))
    expect(res.status).toBe(401)
  })

  it("creates a visit without GPS (no geofence check) and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.create).mockResolvedValue({ id: "v-new" } as any)

    const res = await POST(makePostReq({ agentId: "agent-1", customerId: "cust-1", notes: "hello" }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)

    // calculateDistance should NOT be called when no lat/lng provided
    expect(calculateDistance).not.toHaveBeenCalled()
  })

  it("creates a visit when within geofence radius", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findFirst).mockResolvedValue({
      id: "cust-1", name: "Customer A", latitude: 40.41, longitude: 49.87,
    } as any)
    vi.mocked(prisma.mtmSetting.findFirst).mockResolvedValue({ value: "200" } as any)
    vi.mocked(calculateDistance).mockReturnValue(50) // 50m < 200m
    vi.mocked(prisma.mtmVisit.create).mockResolvedValue({ id: "v-ok" } as any)

    const res = await POST(makePostReq({
      agentId: "agent-1", customerId: "cust-1",
      latitude: 40.4095, longitude: 49.868,
    }))
    expect(res.status).toBe(201)
    expect(prisma.mtmAlert.create).not.toHaveBeenCalled()
  })

  it("blocks visit when outside geofence and no force flag", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findFirst).mockResolvedValue({
      id: "cust-1", name: "Customer A", latitude: 40.41, longitude: 49.87,
    } as any)
    vi.mocked(prisma.mtmSetting.findFirst).mockResolvedValue({ value: "100" } as any)
    vi.mocked(calculateDistance).mockReturnValue(500) // 500m > 100m
    vi.mocked(prisma.mtmAlert.create).mockResolvedValue({} as any)

    const res = await POST(makePostReq({
      agentId: "agent-1", customerId: "cust-1",
      latitude: 40.42, longitude: 49.88,
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Too far from customer")
    expect(json.distanceMeters).toBe(500)
    expect(json.geofenceRadius).toBe(100)

    // Alert should have been created
    expect(prisma.mtmAlert.create).toHaveBeenCalledTimes(1)
    const alertData = vi.mocked(prisma.mtmAlert.create).mock.calls[0][0] as any
    expect(alertData.data.type).toBe("OUT_OF_ZONE")
  })

  it("allows visit with force flag even outside geofence", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findFirst).mockResolvedValue({
      id: "cust-1", name: "Customer A", latitude: 40.41, longitude: 49.87,
    } as any)
    vi.mocked(prisma.mtmSetting.findFirst).mockResolvedValue({ value: "100" } as any)
    vi.mocked(calculateDistance).mockReturnValue(500)
    vi.mocked(prisma.mtmAlert.create).mockResolvedValue({} as any)
    vi.mocked(prisma.mtmVisit.create).mockResolvedValue({ id: "v-forced" } as any)

    const res = await POST(makePostReq({
      agentId: "agent-1", customerId: "cust-1",
      latitude: 40.42, longitude: 49.88, force: true,
    }))
    expect(res.status).toBe(201)
    // Alert is still created even with force
    expect(prisma.mtmAlert.create).toHaveBeenCalledTimes(1)
  })

  it("uses default 100m geofence when no setting exists", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findFirst).mockResolvedValue({
      id: "cust-1", name: "Customer A", latitude: 40.41, longitude: 49.87,
    } as any)
    vi.mocked(prisma.mtmSetting.findFirst).mockResolvedValue(null) // no setting
    vi.mocked(calculateDistance).mockReturnValue(150) // 150m > default 100m
    vi.mocked(prisma.mtmAlert.create).mockResolvedValue({} as any)

    const res = await POST(makePostReq({
      agentId: "agent-1", customerId: "cust-1",
      latitude: 40.42, longitude: 49.88,
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.geofenceRadius).toBe(100)
  })

  it("skips geofence check when customer has no coordinates", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findFirst).mockResolvedValue({
      id: "cust-1", name: "Customer A", latitude: null, longitude: null,
    } as any)
    vi.mocked(prisma.mtmVisit.create).mockResolvedValue({ id: "v-no-geo" } as any)

    const res = await POST(makePostReq({
      agentId: "agent-1", customerId: "cust-1",
      latitude: 40.42, longitude: 49.88,
    }))
    expect(res.status).toBe(201)
    expect(calculateDistance).not.toHaveBeenCalled()
  })

  it("returns 400 on create failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmVisit.create).mockRejectedValue(new Error("DB constraint"))

    const res = await POST(makePostReq({ agentId: "bad", customerId: "c1" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("DB constraint")
  })
})
