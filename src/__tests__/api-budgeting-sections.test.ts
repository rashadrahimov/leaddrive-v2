import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budgetSection: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

import { GET, POST } from "@/app/api/budgeting/sections/route"
import { PUT, DELETE } from "@/app/api/budgeting/sections/[id]/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const ORG = "org-test-123"

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function jsonReq(url: string, body: unknown, method = "POST"): NextRequest {
  return makeReq(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

/* ───────────── GET /api/budgeting/sections ───────────── */

describe("GET /api/budgeting/sections", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await GET(makeReq("http://localhost:3000/api/budgeting/sections"))
    expect(res.status).toBe(401)
  })

  it("returns 400 when planId query param is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await GET(makeReq("http://localhost:3000/api/budgeting/sections"))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("planId required")
  })

  it("returns sections ordered by sortOrder", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const sections = [
      { id: "s1", name: "Revenue", sortOrder: 0 },
      { id: "s2", name: "Expenses", sortOrder: 1 },
    ]
    vi.mocked(prisma.budgetSection.findMany).mockResolvedValue(sections as any)

    const res = await GET(makeReq("http://localhost:3000/api/budgeting/sections?planId=plan-1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toEqual(sections)
    expect(prisma.budgetSection.findMany).toHaveBeenCalledWith({
      where: { planId: "plan-1", organizationId: ORG },
      orderBy: { sortOrder: "asc" },
    })
  })
})

/* ───────────── POST /api/budgeting/sections ───────────── */

describe("POST /api/budgeting/sections", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await POST(jsonReq("http://localhost:3000/api/budgeting/sections", { planId: "p1", name: "Rev" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid JSON body", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const req = makeReq("http://localhost:3000/api/budgeting/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{{bad",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid JSON")
  })

  it("returns 400 when name is empty", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq("http://localhost:3000/api/budgeting/sections", { planId: "p1", name: "" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Validation failed")
  })

  it("rejects unknown fields due to strict schema", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await POST(jsonReq("http://localhost:3000/api/budgeting/sections", { planId: "p1", name: "Rev", extraField: true }))
    expect(res.status).toBe(400)
  })

  it("creates section with defaults and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const created = { id: "sec-1", name: "Revenue", sectionType: "expense", sortOrder: 0 }
    vi.mocked(prisma.budgetSection.create).mockResolvedValue(created as any)

    const res = await POST(jsonReq("http://localhost:3000/api/budgeting/sections", { planId: "p1", name: "Revenue" }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("sec-1")
    expect(prisma.budgetSection.create).toHaveBeenCalledWith({
      data: {
        organizationId: ORG,
        planId: "p1",
        name: "Revenue",
        sectionType: "expense",
        sortOrder: 0,
      },
    })
  })
})

/* ───────────── PUT /api/budgeting/sections/[id] ───────────── */

describe("PUT /api/budgeting/sections/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const req = jsonReq("http://localhost:3000/api/budgeting/sections/sec-1", { name: "Updated" }, "PUT")
    const res = await PUT(req, makeParams("sec-1"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when section does not exist", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetSection.updateMany).mockResolvedValue({ count: 0 } as any)

    const req = jsonReq("http://localhost:3000/api/budgeting/sections/nonexistent", { name: "Updated" }, "PUT")
    const res = await PUT(req, makeParams("nonexistent"))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Not found")
  })

  it("updates section and returns updated data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetSection.updateMany).mockResolvedValue({ count: 1 } as any)
    const updated = { id: "sec-1", name: "Renamed", sectionType: "revenue", sortOrder: 2 }
    vi.mocked(prisma.budgetSection.findFirst).mockResolvedValue(updated as any)

    const req = jsonReq("http://localhost:3000/api/budgeting/sections/sec-1", { name: "Renamed", sortOrder: 2 }, "PUT")
    const res = await PUT(req, makeParams("sec-1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("Renamed")
  })
})

/* ───────────── DELETE /api/budgeting/sections/[id] ───────────── */

describe("DELETE /api/budgeting/sections/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const req = makeReq("http://localhost:3000/api/budgeting/sections/sec-1", { method: "DELETE" })
    const res = await DELETE(req, makeParams("sec-1"))
    expect(res.status).toBe(401)
  })

  it("deletes section and returns success with null data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetSection.deleteMany).mockResolvedValue({ count: 1 } as any)

    const req = makeReq("http://localhost:3000/api/budgeting/sections/sec-1", { method: "DELETE" })
    const res = await DELETE(req, makeParams("sec-1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toBeNull()
    expect(prisma.budgetSection.deleteMany).toHaveBeenCalledWith({
      where: { id: "sec-1", organizationId: ORG },
    })
  })
})
