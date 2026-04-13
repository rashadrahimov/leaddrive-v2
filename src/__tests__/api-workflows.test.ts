import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workflowRule: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    workflowAction: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

import { GET, POST } from "@/app/api/v1/workflows/route"
import { GET as GET_BY_ID, PUT, DELETE } from "@/app/api/v1/workflows/[id]/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

function makeRequest(url: string, opts?: RequestInit) {
  return new Request(url, opts) as any
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/v1/workflows
// ---------------------------------------------------------------------------
describe("GET /api/v1/workflows", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET(makeRequest("http://localhost/api/v1/workflows"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns workflows with actions included", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const workflows = [
      { id: "wf1", name: "Auto-close", entityType: "ticket", triggerEvent: "status_changed", actions: [{ id: "act1", actionType: "send_email" }] },
    ]
    vi.mocked(prisma.workflowRule.findMany).mockResolvedValue(workflows as any)

    const res = await GET(makeRequest("http://localhost/api/v1/workflows"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].actions).toHaveLength(1)
  })

  it("includes actions ordered by actionOrder", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.workflowRule.findMany).mockResolvedValue([])

    await GET(makeRequest("http://localhost/api/v1/workflows"))

    const call = vi.mocked(prisma.workflowRule.findMany).mock.calls[0][0] as any
    expect(call.include.actions.orderBy).toEqual({ actionOrder: "asc" })
  })

  it("returns 500 on database error", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.workflowRule.findMany).mockRejectedValue(new Error("DB error"))

    const res = await GET(makeRequest("http://localhost/api/v1/workflows"))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Internal server error")
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/workflows
// ---------------------------------------------------------------------------
describe("POST /api/v1/workflows", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST(makeRequest("http://localhost/api/v1/workflows", {
      method: "POST",
      body: JSON.stringify({ name: "Test", entityType: "ticket", triggerEvent: "created" }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when name is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")

    const res = await POST(makeRequest("http://localhost/api/v1/workflows", {
      method: "POST",
      body: JSON.stringify({ entityType: "ticket", triggerEvent: "created" }),
    }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when entityType is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")

    const res = await POST(makeRequest("http://localhost/api/v1/workflows", {
      method: "POST",
      body: JSON.stringify({ name: "Test", triggerEvent: "created" }),
    }))
    expect(res.status).toBe(400)
  })

  it("creates workflow with defaults", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const created = { id: "wf-new", name: "New Rule", entityType: "deal", triggerEvent: "updated", conditions: {}, isActive: true, actions: [] }
    vi.mocked(prisma.workflowRule.create).mockResolvedValue(created as any)

    const res = await POST(makeRequest("http://localhost/api/v1/workflows", {
      method: "POST",
      body: JSON.stringify({ name: "New Rule", entityType: "deal", triggerEvent: "updated" }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("wf-new")

    const createCall = vi.mocked(prisma.workflowRule.create).mock.calls[0][0] as any
    expect(createCall.data.organizationId).toBe("org-1")
    expect(createCall.data.conditions).toEqual({})
    expect(createCall.data.isActive).toBe(true)
    expect(createCall.include).toEqual({ actions: true })
  })

  it("creates workflow with custom conditions and isActive=false", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const created = { id: "wf2", name: "Custom", entityType: "ticket", triggerEvent: "created", conditions: { priority: "critical" }, isActive: false, actions: [] }
    vi.mocked(prisma.workflowRule.create).mockResolvedValue(created as any)

    const res = await POST(makeRequest("http://localhost/api/v1/workflows", {
      method: "POST",
      body: JSON.stringify({ name: "Custom", entityType: "ticket", triggerEvent: "created", conditions: { priority: "critical" }, isActive: false }),
    }))
    expect(res.status).toBe(201)

    const createCall = vi.mocked(prisma.workflowRule.create).mock.calls[0][0] as any
    expect(createCall.data.isActive).toBe(false)
    expect(createCall.data.conditions).toEqual({ priority: "critical" })
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/workflows/:id
// ---------------------------------------------------------------------------
describe("GET /api/v1/workflows/:id", () => {
  it("returns workflow when found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const rule = { id: "wf1", name: "Rule", organizationId: "org-1", actions: [] }
    vi.mocked(prisma.workflowRule.findFirst).mockResolvedValue(rule as any)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/workflows/wf1"), makeParams("wf1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("wf1")
  })

  it("returns 404 when workflow not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.workflowRule.findFirst).mockResolvedValue(null)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/workflows/nope"), makeParams("nope"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Not found")
  })

  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/workflows/wf1"), makeParams("wf1"))
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/v1/workflows/:id
// ---------------------------------------------------------------------------
describe("PUT /api/v1/workflows/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await PUT(
      makeRequest("http://localhost/api/v1/workflows/wf1", { method: "PUT", body: JSON.stringify({ name: "X" }) }),
      makeParams("wf1")
    )
    expect(res.status).toBe(401)
  })

  it("updates rule fields without actions (no transaction)", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.workflowRule.updateMany).mockResolvedValue({ count: 1 } as any)
    const updated = { id: "wf1", name: "Renamed", entityType: "ticket", triggerEvent: "created", actions: [] }
    vi.mocked(prisma.workflowRule.findFirst).mockResolvedValue(updated as any)

    const res = await PUT(
      makeRequest("http://localhost/api/v1/workflows/wf1", { method: "PUT", body: JSON.stringify({ name: "Renamed" }) }),
      makeParams("wf1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.name).toBe("Renamed")

    // Should not use $transaction when actions not provided
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("uses transaction when actions are provided", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        workflowRule: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        workflowAction: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }), createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      }
      return fn(tx)
    })
    const updated = { id: "wf1", name: "Rule", actions: [{ id: "a1", actionType: "send_email", actionOrder: 0 }] }
    vi.mocked(prisma.workflowRule.findFirst).mockResolvedValue(updated as any)

    const res = await PUT(
      makeRequest("http://localhost/api/v1/workflows/wf1", {
        method: "PUT",
        body: JSON.stringify({
          name: "Rule",
          actions: [{ actionType: "send_email", actionConfig: { to: "x@y.com" }, actionOrder: 0 }],
        }),
      }),
      makeParams("wf1")
    )
    expect(res.status).toBe(200)
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("returns 404 when rule not found for update (no actions)", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.workflowRule.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await PUT(
      makeRequest("http://localhost/api/v1/workflows/wf1", { method: "PUT", body: JSON.stringify({ name: "X" }) }),
      makeParams("wf1")
    )
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Not found")
  })

  it("validates action schema in body", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")

    const res = await PUT(
      makeRequest("http://localhost/api/v1/workflows/wf1", {
        method: "PUT",
        body: JSON.stringify({ actions: [{ actionConfig: {} }] }),
      }),
      makeParams("wf1")
    )
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/workflows/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/workflows/:id", () => {
  it("deletes workflow and its actions", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.workflowAction.deleteMany).mockResolvedValue({ count: 2 } as any)
    vi.mocked(prisma.workflowRule.deleteMany).mockResolvedValue({ count: 1 } as any)

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/workflows/wf1", { method: "DELETE" }),
      makeParams("wf1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.deleted).toBe("wf1")

    // Verify actions are deleted first
    expect(prisma.workflowAction.deleteMany).toHaveBeenCalledWith({ where: { ruleId: "wf1" } })
    expect(prisma.workflowRule.deleteMany).toHaveBeenCalledWith({ where: { id: "wf1", organizationId: "org-1" } })
  })

  it("returns 404 when workflow not found for deletion", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.workflowAction.deleteMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.workflowRule.deleteMany).mockResolvedValue({ count: 0 } as any)

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/workflows/wf1", { method: "DELETE" }),
      makeParams("wf1")
    )
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Not found")
  })

  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/workflows/wf1", { method: "DELETE" }),
      makeParams("wf1")
    )
    expect(res.status).toBe(401)
  })
})
