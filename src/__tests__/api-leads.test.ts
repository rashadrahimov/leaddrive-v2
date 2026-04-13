import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getSession: vi.fn(),
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/field-filter", () => ({
  getFieldPermissions: vi.fn().mockResolvedValue([]),
  filterEntityFields: vi.fn().mockImplementation((data) => data),
  filterWritableFields: vi.fn().mockImplementation((data) => data),
}))

vi.mock("@/lib/sharing-rules", () => ({
  applyRecordFilter: vi.fn().mockImplementation((_o, _u, _r, _e, where) => where),
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/workflow-engine", () => ({
  executeWorkflows: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/webhooks", () => ({
  fireWebhooks: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/lead-assignment", () => ({
  applyLeadAssignmentRules: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from "@/app/api/v1/leads/route"
import {
  GET as GET_BY_ID,
  PUT,
  DELETE,
} from "@/app/api/v1/leads/[id]/route"
import { prisma } from "@/lib/prisma"
import { getSession, getOrgId } from "@/lib/api-auth"
import { applyLeadAssignmentRules } from "@/lib/lead-assignment"
import { createNotification } from "@/lib/notifications"
import { executeWorkflows } from "@/lib/workflow-engine"

const SESSION = {
  orgId: "org-1",
  userId: "user-1",
  role: "admin",
  email: "a@b.com",
  name: "Test",
}

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/v1/leads
// ---------------------------------------------------------------------------
describe("GET /api/v1/leads", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET(makeRequest("http://localhost:3000/api/v1/leads"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns leads with default pagination", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const fakeLead = { id: "l1", contactName: "Alice", organizationId: "org-1" }
    vi.mocked(prisma.lead.findMany).mockResolvedValue([fakeLead] as any)
    vi.mocked(prisma.lead.count).mockResolvedValue(1)

    const res = await GET(makeRequest("http://localhost:3000/api/v1/leads"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.leads).toHaveLength(1)
    expect(body.data.total).toBe(1)
    expect(body.data.page).toBe(1)
    expect(body.data.limit).toBe(50)
  })

  it("applies search filter as OR on contactName, companyName, email", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.lead.count).mockResolvedValue(0)

    await GET(makeRequest("http://localhost:3000/api/v1/leads?search=acme"))

    const call = vi.mocked(prisma.lead.findMany).mock.calls[0][0] as any
    const where = call.where
    expect(where.OR).toEqual([
      { contactName: { contains: "acme", mode: "insensitive" } },
      { companyName: { contains: "acme", mode: "insensitive" } },
      { email: { contains: "acme", mode: "insensitive" } },
    ])
  })

  it("filters by exact status when status param provided", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.lead.count).mockResolvedValue(0)

    await GET(makeRequest("http://localhost:3000/api/v1/leads?status=qualified"))

    const call = vi.mocked(prisma.lead.findMany).mock.calls[0][0] as any
    expect(call.where.status).toBe("qualified")
  })

  it("includes converted leads when includeConverted=true", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.lead.count).mockResolvedValue(0)

    await GET(
      makeRequest("http://localhost:3000/api/v1/leads?includeConverted=true")
    )

    const call = vi.mocked(prisma.lead.findMany).mock.calls[0][0] as any
    expect(call.where.status).toBeUndefined()
  })

  it("excludes converted by default", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.findMany).mockResolvedValue([])
    vi.mocked(prisma.lead.count).mockResolvedValue(0)

    await GET(makeRequest("http://localhost:3000/api/v1/leads"))

    const call = vi.mocked(prisma.lead.findMany).mock.calls[0][0] as any
    expect(call.where.status).toEqual({ not: "converted" })
  })

  it("BUG: catch block returns success:true with empty data instead of 500", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.findMany).mockRejectedValue(new Error("DB down"))

    const res = await GET(makeRequest("http://localhost:3000/api/v1/leads"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.leads).toEqual([])
    expect(body.data.total).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/leads
// ---------------------------------------------------------------------------
describe("POST /api/v1/leads", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST(
      makeRequest("http://localhost:3000/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({ contactName: "Bob" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when contactName is missing", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)

    const res = await POST(
      makeRequest("http://localhost:3000/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it("creates a lead and returns 201", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const created = {
      id: "l-new",
      contactName: "Bob",
      companyName: "Acme",
      status: "new",
      priority: "medium",
      organizationId: "org-1",
    }
    vi.mocked(prisma.lead.create).mockResolvedValue(created as any)

    const res = await POST(
      makeRequest("http://localhost:3000/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({ contactName: "Bob", companyName: "Acme" }),
      })
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.contactName).toBe("Bob")
  })

  it("defaults status to 'new' and priority to 'medium'", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.create).mockResolvedValue({
      id: "l2",
      contactName: "Eve",
      status: "new",
      priority: "medium",
    } as any)

    await POST(
      makeRequest("http://localhost:3000/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({ contactName: "Eve" }),
      })
    )

    const call = vi.mocked(prisma.lead.create).mock.calls[0][0] as any
    expect(call.data.status).toBe("new")
    expect(call.data.priority).toBe("medium")
  })

  it("calls applyLeadAssignmentRules after creation", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const created = { id: "l3", contactName: "Dan", organizationId: "org-1" }
    vi.mocked(prisma.lead.create).mockResolvedValue(created as any)

    await POST(
      makeRequest("http://localhost:3000/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({ contactName: "Dan" }),
      })
    )

    expect(applyLeadAssignmentRules).toHaveBeenCalledWith("org-1", created)
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/leads/:id
// ---------------------------------------------------------------------------
describe("GET /api/v1/leads/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_BY_ID(
      makeRequest("http://localhost:3000/api/v1/leads/l1"),
      makeParams("l1")
    )
    expect(res.status).toBe(401)
  })

  it("returns the lead when found", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const lead = { id: "l1", contactName: "Alice", organizationId: "org-1" }
    vi.mocked(prisma.lead.findFirst).mockResolvedValue(lead as any)

    const res = await GET_BY_ID(
      makeRequest("http://localhost:3000/api/v1/leads/l1"),
      makeParams("l1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.contactName).toBe("Alice")
  })

  it("returns 404 when lead not found", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)

    const res = await GET_BY_ID(
      makeRequest("http://localhost:3000/api/v1/leads/nonexistent"),
      makeParams("nonexistent")
    )
    expect(res.status).toBe(404)
  })

  it("BUG: catch block returns 404 instead of 500", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.findFirst).mockRejectedValue(new Error("DB crash"))

    const res = await GET_BY_ID(
      makeRequest("http://localhost:3000/api/v1/leads/l1"),
      makeParams("l1")
    )
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Not found")
  })
})

// ---------------------------------------------------------------------------
// PUT /api/v1/leads/:id
// ---------------------------------------------------------------------------
describe("PUT /api/v1/leads/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await PUT(
      makeRequest("http://localhost:3000/api/v1/leads/l1", {
        method: "PUT",
        body: JSON.stringify({ contactName: "Updated" }),
      }),
      makeParams("l1")
    )
    expect(res.status).toBe(401)
  })

  it("updates a lead and returns it", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.updateMany).mockResolvedValue({ count: 1 } as any)
    const updated = { id: "l1", contactName: "Updated", organizationId: "org-1" }
    vi.mocked(prisma.lead.findFirst).mockResolvedValue(updated as any)

    const res = await PUT(
      makeRequest("http://localhost:3000/api/v1/leads/l1", {
        method: "PUT",
        body: JSON.stringify({ contactName: "Updated" }),
      }),
      makeParams("l1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.contactName).toBe("Updated")
  })

  it("returns 404 when lead not found (count===0)", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await PUT(
      makeRequest("http://localhost:3000/api/v1/leads/nonexistent", {
        method: "PUT",
        body: JSON.stringify({ contactName: "Nope" }),
      }),
      makeParams("nonexistent")
    )
    expect(res.status).toBe(404)
  })

  it("creates notification with correct type when status changes to converted", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.updateMany).mockResolvedValue({ count: 1 } as any)
    const updated = {
      id: "l1",
      contactName: "Alice",
      status: "converted",
      organizationId: "org-1",
    }
    vi.mocked(prisma.lead.findFirst).mockResolvedValue(updated as any)

    await PUT(
      makeRequest("http://localhost:3000/api/v1/leads/l1", {
        method: "PUT",
        body: JSON.stringify({ status: "converted" }),
      }),
      makeParams("l1")
    )

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        type: "success",
        entityType: "lead",
        entityId: "l1",
      })
    )

    expect(executeWorkflows).toHaveBeenCalledWith(
      "org-1",
      "lead",
      "status_changed",
      updated
    )
  })

  it("triggers 'updated' workflow when no status change", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.lead.updateMany).mockResolvedValue({ count: 1 } as any)
    const updated = { id: "l1", contactName: "Alice2", organizationId: "org-1" }
    vi.mocked(prisma.lead.findFirst).mockResolvedValue(updated as any)

    await PUT(
      makeRequest("http://localhost:3000/api/v1/leads/l1", {
        method: "PUT",
        body: JSON.stringify({ contactName: "Alice2" }),
      }),
      makeParams("l1")
    )

    expect(executeWorkflows).toHaveBeenCalledWith(
      "org-1",
      "lead",
      "updated",
      updated
    )
    expect(createNotification).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/leads/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/leads/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await DELETE(
      makeRequest("http://localhost:3000/api/v1/leads/l1", { method: "DELETE" }),
      makeParams("l1")
    )
    expect(res.status).toBe(401)
  })

  it("deletes a lead and returns its id", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.lead.findFirst).mockResolvedValue({ contactName: "Alice" } as any)
    vi.mocked(prisma.lead.deleteMany).mockResolvedValue({ count: 1 } as any)

    const res = await DELETE(
      makeRequest("http://localhost:3000/api/v1/leads/l1", { method: "DELETE" }),
      makeParams("l1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.deleted).toBe("l1")
  })

  it("returns 404 when lead not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.lead.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.lead.deleteMany).mockResolvedValue({ count: 0 } as any)

    const res = await DELETE(
      makeRequest("http://localhost:3000/api/v1/leads/nonexistent", {
        method: "DELETE",
      }),
      makeParams("nonexistent")
    )
    expect(res.status).toBe(404)
  })
})
