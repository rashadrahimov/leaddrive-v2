import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contract: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    auditLog: { findMany: vi.fn(), create: vi.fn() },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({ getSession: vi.fn(), getOrgId: vi.fn() }))
vi.mock("@/lib/constants", () => ({ PAGE_SIZE: { DEFAULT: 50, DASHBOARD_RECENT: 10, DASHBOARD_TASKS: 10 } }))

import { GET, POST } from "@/app/api/v1/contracts/route"
import { GET as GET_BY_ID, PUT, DELETE } from "@/app/api/v1/contracts/[id]/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getOrgId).mockResolvedValue("org-1")
})

// ─── GET /api/v1/contracts ──────────────────────────────────────────

describe("GET /api/v1/contracts", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await GET(makeReq("http://localhost:3000/api/v1/contracts"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns paginated contracts with defaults", async () => {
    const contracts = [{ id: "c1", title: "Contract A" }]
    vi.mocked(prisma.contract.findMany).mockResolvedValue(contracts as any)
    vi.mocked(prisma.contract.count).mockResolvedValue(1)

    const res = await GET(makeReq("http://localhost:3000/api/v1/contracts"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.contracts).toEqual(contracts)
    expect(json.data.total).toBe(1)
    expect(json.data.page).toBe(1)
    expect(json.data.limit).toBe(50)
    expect(json.data.search).toBe("")
  })

  it("passes search, status and companyId filters", async () => {
    vi.mocked(prisma.contract.findMany).mockResolvedValue([] as any)
    vi.mocked(prisma.contract.count).mockResolvedValue(0)

    await GET(makeReq("http://localhost:3000/api/v1/contracts?search=test&status=active&companyId=comp-1&page=2&limit=10"))

    const call = vi.mocked(prisma.contract.findMany).mock.calls[0][0] as any
    expect(call.where.organizationId).toBe("org-1")
    expect(call.where.title).toEqual({ contains: "test", mode: "insensitive" })
    expect(call.where.status).toBe("active")
    expect(call.where.companyId).toBe("comp-1")
    expect(call.skip).toBe(10) // (page 2 - 1) * limit 10
    expect(call.take).toBe(10)
  })

  it("BUG: catch returns success:true with empty data instead of 500", async () => {
    vi.mocked(prisma.contract.findMany).mockRejectedValue(new Error("DB down"))

    const res = await GET(makeReq("http://localhost:3000/api/v1/contracts"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.contracts).toEqual([])
    expect(json.data.total).toBe(0)
  })
})

// ─── POST /api/v1/contracts ─────────────────────────────────────────

describe("POST /api/v1/contracts", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await POST(makeReq("http://localhost:3000/api/v1/contracts", {
      method: "POST",
      body: JSON.stringify({ contractNumber: "C-001", title: "Test" }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when contractNumber is missing", async () => {
    const res = await POST(makeReq("http://localhost:3000/api/v1/contracts", {
      method: "POST",
      body: JSON.stringify({ title: "Test" }),
    }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeReq("http://localhost:3000/api/v1/contracts", {
      method: "POST",
      body: JSON.stringify({ contractNumber: "C-001" }),
    }))
    expect(res.status).toBe(400)
  })

  it("creates contract with 201 and converts dates", async () => {
    const created = { id: "c1", contractNumber: "C-001", title: "Test", startDate: new Date("2026-01-01") }
    vi.mocked(prisma.contract.create).mockResolvedValue(created as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/contracts", {
      method: "POST",
      body: JSON.stringify({ contractNumber: "C-001", title: "Test", startDate: "2026-01-01", endDate: "2026-12-31" }),
    }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("c1")

    const createCall = vi.mocked(prisma.contract.create).mock.calls[0][0] as any
    expect(createCall.data.organizationId).toBe("org-1")
    expect(createCall.data.startDate).toEqual(new Date("2026-01-01"))
    expect(createCall.data.endDate).toEqual(new Date("2026-12-31"))
  })

  it("returns 500 on DB error", async () => {
    vi.mocked(prisma.contract.create).mockRejectedValue(new Error("DB error"))

    const res = await POST(makeReq("http://localhost:3000/api/v1/contracts", {
      method: "POST",
      body: JSON.stringify({ contractNumber: "C-001", title: "Test" }),
    }))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe("Internal server error")
  })
})

// ─── GET /api/v1/contracts/:id ──────────────────────────────────────

describe("GET /api/v1/contracts/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/contracts/c1"), makeParams("c1"))
    expect(res.status).toBe(401)
  })

  it("returns contract with history", async () => {
    const contract = { id: "c1", title: "Contract A", organizationId: "org-1" }
    const history = [{ id: "log-1", action: "create" }]
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(contract as any)
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(history as any)

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/contracts/c1"), makeParams("c1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("c1")
    expect(json.data.history).toEqual(history)
  })

  it("returns 404 when not found", async () => {
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(null)

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/contracts/bad"), makeParams("bad"))
    expect(res.status).toBe(404)
  })

  it("BUG: catch returns 404 instead of 500", async () => {
    vi.mocked(prisma.contract.findFirst).mockRejectedValue(new Error("DB crash"))

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/contracts/c1"), makeParams("c1"))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Not found")
  })
})

// ─── PUT /api/v1/contracts/:id ──────────────────────────────────────

describe("PUT /api/v1/contracts/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/contracts/c1", { method: "PUT", body: JSON.stringify({ title: "X" }) }),
      makeParams("c1"),
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when old contract not found", async () => {
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(null)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/contracts/c1", { method: "PUT", body: JSON.stringify({ title: "Updated" }) }),
      makeParams("c1"),
    )
    expect(res.status).toBe(404)
  })

  it("updates contract and creates audit log on change", async () => {
    const old = { id: "c1", title: "Old Title", contractNumber: "C-001", organizationId: "org-1", startDate: null, endDate: null }
    const updated = { ...old, title: "New Title" }
    vi.mocked(prisma.contract.findFirst)
      .mockResolvedValueOnce(old as any)   // old values lookup
      .mockResolvedValueOnce(updated as any) // re-fetch after update
    vi.mocked(prisma.contract.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/contracts/c1", { method: "PUT", body: JSON.stringify({ title: "New Title" }) }),
      makeParams("c1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.title).toBe("New Title")

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1)
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0] as any
    expect(auditCall.data.action).toBe("update")
    expect(auditCall.data.entityType).toBe("contract")
    expect(auditCall.data.entityId).toBe("c1")
  })

  it("returns 404 when updateMany count is 0", async () => {
    const old = { id: "c1", title: "Title", organizationId: "org-1", startDate: null, endDate: null }
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(old as any)
    vi.mocked(prisma.contract.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/contracts/c1", { method: "PUT", body: JSON.stringify({ title: "X" }) }),
      makeParams("c1"),
    )
    expect(res.status).toBe(404)
  })

  it("returns 500 on unexpected error", async () => {
    vi.mocked(prisma.contract.findFirst).mockRejectedValue(new Error("boom"))

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/contracts/c1", { method: "PUT", body: JSON.stringify({ title: "X" }) }),
      makeParams("c1"),
    )
    expect(res.status).toBe(500)
  })
})

// ─── DELETE /api/v1/contracts/:id ───────────────────────────────────

describe("DELETE /api/v1/contracts/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await DELETE(makeReq("http://localhost:3000/api/v1/contracts/c1"), makeParams("c1"))
    expect(res.status).toBe(401)
  })

  it("deletes contract and logs audit", async () => {
    const contract = { id: "c1", title: "To Delete", organizationId: "org-1" }
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(contract as any)
    vi.mocked(prisma.contract.deleteMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any)

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/contracts/c1"), makeParams("c1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.deleted).toBe("c1")

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1)
    const auditCall = vi.mocked(prisma.auditLog.create).mock.calls[0][0] as any
    expect(auditCall.data.action).toBe("delete")
    expect(auditCall.data.entityType).toBe("contract")
  })

  it("returns 404 when deleteMany count is 0", async () => {
    vi.mocked(prisma.contract.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.contract.deleteMany).mockResolvedValue({ count: 0 } as any)

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/contracts/bad"), makeParams("bad"))
    expect(res.status).toBe(404)
  })

  it("returns 500 on unexpected error", async () => {
    vi.mocked(prisma.contract.findFirst).mockRejectedValue(new Error("fail"))

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/contracts/c1"), makeParams("c1"))
    expect(res.status).toBe(500)
  })
})
