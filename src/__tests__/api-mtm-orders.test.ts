import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mtmOrder: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

import { GET, POST } from "@/app/api/v1/mtm/orders/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const ORG = "org-1"

const sampleOrder = {
  id: "order-1",
  organizationId: ORG,
  agentId: "agent-1",
  customerId: "cust-1",
  orderNumber: "ORD-00001",
  status: "DRAFT",
  items: '[{"name":"Widget","price":10,"qty":5}]',
  totalAmount: 50,
  notes: null,
  createdAt: new Date("2026-04-10T10:00:00Z"),
  agent: { id: "agent-1", name: "John" },
  customer: { id: "cust-1", name: "Customer A" },
}

function makeReq(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

function makePostReq(body: unknown): NextRequest {
  return new NextRequest(new URL("http://localhost:3000/api/v1/mtm/orders"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/v1/mtm/orders ─────────────────────────────────
describe("GET /api/v1/mtm/orders", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET(makeReq("/api/v1/mtm/orders"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns paginated orders", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findMany).mockResolvedValue([sampleOrder] as any)
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(1)

    const res = await GET(makeReq("/api/v1/mtm/orders"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.orders).toHaveLength(1)
    expect(json.data.total).toBe(1)
    expect(json.data.page).toBe(1)
    expect(json.data.limit).toBe(50)
  })

  it("filters by agentId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/orders?agentId=agent-1"))

    const callArgs = vi.mocked(prisma.mtmOrder.findMany).mock.calls[0][0] as any
    expect(callArgs.where.agentId).toBe("agent-1")
  })

  it("filters by customerId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/orders?customerId=cust-1"))

    const callArgs = vi.mocked(prisma.mtmOrder.findMany).mock.calls[0][0] as any
    expect(callArgs.where.customerId).toBe("cust-1")
  })

  it("filters by status", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/orders?status=CONFIRMED"))

    const callArgs = vi.mocked(prisma.mtmOrder.findMany).mock.calls[0][0] as any
    expect(callArgs.where.status).toBe("CONFIRMED")
  })

  it("respects page and limit params", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(50)

    const res = await GET(makeReq("/api/v1/mtm/orders?page=2&limit=20"))
    const json = await res.json()
    expect(json.data.page).toBe(2)
    expect(json.data.limit).toBe(20)

    const callArgs = vi.mocked(prisma.mtmOrder.findMany).mock.calls[0][0] as any
    expect(callArgs.skip).toBe(20) // (2-1)*20
    expect(callArgs.take).toBe(20)
  })

  it("clamps limit to max 200", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)

    await GET(makeReq("/api/v1/mtm/orders?limit=500"))

    const callArgs = vi.mocked(prisma.mtmOrder.findMany).mock.calls[0][0] as any
    expect(callArgs.take).toBe(200)
  })

  it("returns empty array on prisma error", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.findMany).mockRejectedValue(new Error("DB error"))

    const res = await GET(makeReq("/api/v1/mtm/orders"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.orders).toEqual([])
    expect(json.data.total).toBe(0)
  })
})

// ─── POST /api/v1/mtm/orders ────────────────────────────────
describe("POST /api/v1/mtm/orders", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await POST(makePostReq({ agentId: "a1", customerId: "c1" }))
    expect(res.status).toBe(401)
  })

  it("creates an order with items and calculates totalAmount", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    // count returns 5, so next order number is ORD-00006
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(5)
    vi.mocked(prisma.mtmOrder.create).mockResolvedValue({ id: "new-order", orderNumber: "ORD-00006" } as any)

    const body = {
      agentId: "agent-1",
      customerId: "cust-1",
      items: [
        { name: "Widget", price: 10, qty: 3 },
        { name: "Gadget", price: 25, qty: 2 },
      ],
    }

    const res = await POST(makePostReq(body))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)

    const createArgs = vi.mocked(prisma.mtmOrder.create).mock.calls[0][0] as any
    expect(createArgs.data.organizationId).toBe(ORG)
    expect(createArgs.data.orderNumber).toBe("ORD-00006")
    expect(createArgs.data.totalAmount).toBe(80) // 10*3 + 25*2
    expect(createArgs.data.status).toBe("DRAFT") // default
  })

  it("generates sequential order numbers", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)
    vi.mocked(prisma.mtmOrder.create).mockResolvedValue({ id: "o1" } as any)

    await POST(makePostReq({ agentId: "a1", customerId: "c1", items: [] }))

    const createArgs = vi.mocked(prisma.mtmOrder.create).mock.calls[0][0] as any
    expect(createArgs.data.orderNumber).toBe("ORD-00001")
  })

  it("uses provided status instead of default DRAFT", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)
    vi.mocked(prisma.mtmOrder.create).mockResolvedValue({ id: "o2" } as any)

    await POST(makePostReq({ agentId: "a1", customerId: "c1", status: "CONFIRMED", items: [] }))

    const createArgs = vi.mocked(prisma.mtmOrder.create).mock.calls[0][0] as any
    expect(createArgs.data.status).toBe("CONFIRMED")
  })

  it("handles empty items array with zero total", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)
    vi.mocked(prisma.mtmOrder.create).mockResolvedValue({ id: "o3" } as any)

    await POST(makePostReq({ agentId: "a1", customerId: "c1" }))

    const createArgs = vi.mocked(prisma.mtmOrder.create).mock.calls[0][0] as any
    expect(createArgs.data.totalAmount).toBe(0)
    expect(createArgs.data.items).toBe("[]")
  })

  it("returns 400 on create failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmOrder.count).mockResolvedValue(0)
    vi.mocked(prisma.mtmOrder.create).mockRejectedValue(new Error("FK violation"))

    const res = await POST(makePostReq({ agentId: "bad", customerId: "c1", items: [] }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("FK violation")
  })
})
