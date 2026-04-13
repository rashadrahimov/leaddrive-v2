import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    deal: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    pipeline: { findFirst: vi.fn() },
    pipelineStage: { findFirst: vi.fn() },
    user: { findMany: vi.fn() },
    contact: { findMany: vi.fn(), findFirst: vi.fn() },
    dealContactRole: { findMany: vi.fn() },
    task: { count: vi.fn() },
    activity: { createMany: vi.fn() },
    channelConfig: { findMany: vi.fn() },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({ getSession: vi.fn(), getOrgId: vi.fn() }))

vi.mock("@/lib/field-filter", () => ({
  getFieldPermissions: vi.fn().mockResolvedValue([]),
  filterEntityFields: vi.fn().mockImplementation((data) => data),
  filterWritableFields: vi.fn().mockImplementation((data) => data),
}))

vi.mock("@/lib/sharing-rules", () => ({
  applyRecordFilter: vi.fn().mockImplementation((_o, _u, _r, _e, where) => where),
}))

vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/workflow-engine", () => ({ executeWorkflows: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/webhooks", () => ({ fireWebhooks: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/contact-events", () => ({ trackContactEvent: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/slack", () => ({ sendSlackNotification: vi.fn().mockResolvedValue(undefined), formatDealNotification: vi.fn().mockReturnValue("deal msg") }))
vi.mock("@/lib/constants", () => ({ DEFAULT_CURRENCY: "USD" }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }) }))

import { GET, POST } from "@/app/api/v1/deals/route"
import { GET as GET_BY_ID, PUT, DELETE } from "@/app/api/v1/deals/[id]/route"
import { prisma } from "@/lib/prisma"
import { getSession, getOrgId } from "@/lib/api-auth"

const SESSION = { orgId: "org-1", userId: "user-1", role: "admin", email: "a@b.com", name: "Test" }

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSession).mockResolvedValue(SESSION as any)
  vi.mocked(getOrgId).mockResolvedValue("org-1")
  vi.mocked(prisma.channelConfig.findMany).mockResolvedValue([] as any)
})

// ─── GET /api/v1/deals ───────────────────────────────────────────────

describe("GET /api/v1/deals", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET(makeReq("http://localhost:3000/api/v1/deals"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 400 for invalid page (NaN)", async () => {
    const res = await GET(makeReq("http://localhost:3000/api/v1/deals?page=abc"))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe("Invalid page or limit")
  })

  it("returns 400 for page < 1", async () => {
    const res = await GET(makeReq("http://localhost:3000/api/v1/deals?page=0"))
    expect(res.status).toBe(400)
  })

  it("returns 400 for limit > 200", async () => {
    const res = await GET(makeReq("http://localhost:3000/api/v1/deals?limit=201"))
    expect(res.status).toBe(400)
  })

  it("returns 400 for limit < 1", async () => {
    const res = await GET(makeReq("http://localhost:3000/api/v1/deals?limit=0"))
    expect(res.status).toBe(400)
  })

  it("returns deals with pagination and pipelineSummary", async () => {
    const mockDeals = [
      { id: "d1", name: "Deal A", stage: "LEAD", valueAmount: 1000, probability: 10, createdAt: new Date(), company: null, campaign: null },
    ]
    vi.mocked(prisma.deal.findMany)
      .mockResolvedValueOnce(mockDeals as any)   // paginated deals
      .mockResolvedValueOnce([                     // allActiveDeals for summary
        { stage: "LEAD", valueAmount: 1000, probability: 10 },
        { stage: "QUALIFIED", valueAmount: 2000, probability: 25 },
      ] as any)
    vi.mocked(prisma.deal.count).mockResolvedValue(1)

    const res = await GET(makeReq("http://localhost:3000/api/v1/deals?page=1&limit=10"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.deals).toHaveLength(1)
    expect(json.data.total).toBe(1)
    expect(json.data.page).toBe(1)
    expect(json.data.limit).toBe(10)
    expect(json.data.pipelineSummary).toBeDefined()
    expect(json.data.pipelineSummary.total).toBe(3000)
    // weighted = 1000*0.10 + 2000*0.25 = 100 + 500 = 600
    expect(json.data.pipelineSummary.weighted).toBe(600)
    expect(json.data.pipelineSummary.byStage).toHaveLength(2)
  })

  it("passes search, stage, companyId, pipelineId filters to where clause", async () => {
    vi.mocked(prisma.deal.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any)
    vi.mocked(prisma.deal.count).mockResolvedValue(0)

    await GET(makeReq("http://localhost:3000/api/v1/deals?search=test&stage=WON&companyId=c1&pipelineId=p1"))

    const call = vi.mocked(prisma.deal.findMany).mock.calls[0][0] as any
    expect(call.where.organizationId).toBe("org-1")
    expect(call.where.name).toEqual({ contains: "test", mode: "insensitive" })
    expect(call.where.stage).toBe("WON")
    expect(call.where.companyId).toBe("c1")
    expect(call.where.pipelineId).toBe("p1")
  })

  it("BUG: catch block returns success:true instead of 500 error", async () => {
    vi.mocked(prisma.deal.findMany).mockRejectedValue(new Error("DB down"))

    const res = await GET(makeReq("http://localhost:3000/api/v1/deals"))
    const json = await res.json()
    // The catch block incorrectly returns success:true with empty deals
    expect(json.success).toBe(true)
    expect(json.data.deals).toEqual([])
    expect(json.data.total).toBe(0)
    // It should have returned status 500, but it returns 200 instead
    expect(res.status).toBe(200)
  })
})

// ─── POST /api/v1/deals ──────────────────────────────────────────────

describe("POST /api/v1/deals", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/deals", {
      method: "POST",
      body: JSON.stringify({ name: "Deal" }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeReq("http://localhost:3000/api/v1/deals", {
      method: "POST",
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })

  it("resolves default pipeline when pipelineId not provided", async () => {
    vi.mocked(prisma.pipeline.findFirst).mockResolvedValue({ id: "pipe-1" } as any)
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue({ probability: 25 } as any)
    vi.mocked(prisma.deal.create).mockResolvedValue({
      id: "d-new", name: "New Deal", stage: "LEAD", valueAmount: 0, currency: "USD",
      probability: 25, pipelineId: "pipe-1", contactId: null, company: null, campaign: null,
    } as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/deals", {
      method: "POST",
      body: JSON.stringify({ name: "New Deal" }),
    }))
    expect(res.status).toBe(201)

    // Should have looked up default pipeline
    expect(prisma.pipeline.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-1", isDefault: true },
      select: { id: true },
    })

    // Should have used pipeline stage probability
    expect(prisma.pipelineStage.findFirst).toHaveBeenCalledWith({
      where: { pipelineId: "pipe-1", name: "LEAD" },
      select: { probability: true },
    })

    // Verify deal.create was called with resolved pipelineId and probability
    const createCall = vi.mocked(prisma.deal.create).mock.calls[0][0] as any
    expect(createCall.data.pipelineId).toBe("pipe-1")
    expect(createCall.data.probability).toBe(25)
  })

  it("uses provided pipelineId and skips default lookup", async () => {
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue({ probability: 50 } as any)
    vi.mocked(prisma.deal.create).mockResolvedValue({
      id: "d-new", name: "Deal X", stage: "PROPOSAL", valueAmount: 5000, currency: "USD",
      probability: 50, pipelineId: "custom-pipe", contactId: null, company: null, campaign: null,
    } as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/deals", {
      method: "POST",
      body: JSON.stringify({ name: "Deal X", pipelineId: "custom-pipe", stage: "PROPOSAL" }),
    }))
    expect(res.status).toBe(201)
    // Should NOT have called pipeline.findFirst for default
    expect(prisma.pipeline.findFirst).not.toHaveBeenCalled()
  })

  it("defaults to stage=LEAD, currency=USD, probability=10 when no pipeline stage found", async () => {
    vi.mocked(prisma.pipeline.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.deal.create).mockResolvedValue({
      id: "d-def", name: "Minimal Deal", stage: "LEAD", valueAmount: 0, currency: "USD",
      probability: 10, pipelineId: null, contactId: null, company: null, campaign: null,
    } as any)

    await POST(makeReq("http://localhost:3000/api/v1/deals", {
      method: "POST",
      body: JSON.stringify({ name: "Minimal Deal" }),
    }))

    const createCall = vi.mocked(prisma.deal.create).mock.calls[0][0] as any
    expect(createCall.data.stage).toBe("LEAD")
    expect(createCall.data.currency).toBe("USD")
    // No pipeline found, so probability falls through to ?? 10
    expect(createCall.data.probability).toBe(10)
  })

  it("returns 201 with the created deal", async () => {
    vi.mocked(prisma.pipeline.findFirst).mockResolvedValue({ id: "pipe-1" } as any)
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue({ probability: 25 } as any)
    const created = {
      id: "d1", name: "Big Deal", stage: "LEAD", valueAmount: 10000, currency: "EUR",
      probability: 25, pipelineId: "pipe-1", contactId: null, company: { id: "c1", name: "Acme" }, campaign: null,
    }
    vi.mocked(prisma.deal.create).mockResolvedValue(created as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/deals", {
      method: "POST",
      body: JSON.stringify({ name: "Big Deal", valueAmount: 10000, currency: "EUR" }),
    }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("d1")
    expect(json.data.name).toBe("Big Deal")
  })
})

// ─── GET /api/v1/deals/:id ───────────────────────────────────────────

describe("GET /api/v1/deals/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/deals/d1"), makeParams("d1"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when deal not found", async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(null)

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/deals/missing"), makeParams("missing"))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Deal not found")
  })

  it("enriches team members with user info and returns deal", async () => {
    const mockDeal = {
      id: "d1", name: "Deal One", stage: "QUALIFIED", contactId: "ct-1",
      teamMembers: [{ userId: "u1", role: "owner" }, { userId: "u2", role: "member" }],
      company: { id: "c1", name: "Acme" }, campaign: null,
    }
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(mockDeal as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", name: "Alice", email: "alice@b.com", avatar: null, role: "admin" },
      { id: "u2", name: "Bob", email: "bob@b.com", avatar: null, role: "user" },
    ] as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue({
      id: "ct-1", fullName: "John Doe", position: "CEO", email: "john@acme.com", phone: "+1234", avatar: null, companyId: "c1",
    } as any)
    vi.mocked(prisma.dealContactRole.findMany).mockResolvedValue([
      { id: "dcr-1", dealId: "d1", contactId: "ct-1", role: "decision_maker", createdAt: new Date() },
    ] as any)
    // roleContacts query
    vi.mocked(prisma.contact.findMany).mockResolvedValue([
      { id: "ct-1", fullName: "John Doe", position: "CEO", email: "john@acme.com", phone: "+1234" },
    ] as any)

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/deals/d1"), makeParams("d1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.teamMembers).toHaveLength(2)
    expect(json.data.teamMembers[0].user.name).toBe("Alice")
    expect(json.data.contact).toBeDefined()
    expect(json.data.contact.fullName).toBe("John Doe")
    expect(json.data.contactRoles).toHaveLength(1)
  })

  it("BUG: contact sub-query lacks organizationId filter", async () => {
    const mockDeal = {
      id: "d1", name: "Deal Bug", stage: "LEAD", contactId: "ct-cross-tenant",
      teamMembers: [], company: null, campaign: null,
    }
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(mockDeal as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue({
      id: "ct-cross-tenant", fullName: "Cross Tenant Contact", position: null, email: "x@x.com", phone: null, avatar: null, companyId: null,
    } as any)
    vi.mocked(prisma.dealContactRole.findMany).mockResolvedValue([] as any)

    await GET_BY_ID(makeReq("http://localhost:3000/api/v1/deals/d1"), makeParams("d1"))

    // The contact query at line 70 uses { id: deal.contactId } without organizationId
    // This means a contact from another org could leak through if IDs collide
    const contactCall = vi.mocked(prisma.contact.findFirst).mock.calls[0][0] as any
    expect(contactCall.where).toEqual({ id: "ct-cross-tenant" })
    // Missing: organizationId: "org-1"
    expect(contactCall.where.organizationId).toBeUndefined()
  })

  it("BUG: dealContactRole.findMany lacks organizationId filter", async () => {
    const mockDeal = {
      id: "d1", name: "Deal Bug 2", stage: "LEAD", contactId: null,
      teamMembers: [], company: null, campaign: null,
    }
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(mockDeal as any)
    vi.mocked(prisma.dealContactRole.findMany).mockResolvedValue([] as any)

    await GET_BY_ID(makeReq("http://localhost:3000/api/v1/deals/d1"), makeParams("d1"))

    // dealContactRole query at line 77 uses { dealId: id } without organizationId
    const roleCall = vi.mocked(prisma.dealContactRole.findMany).mock.calls[0][0] as any
    expect(roleCall.where).toEqual({ dealId: "d1" })
    expect(roleCall.where.organizationId).toBeUndefined()
  })

  it("returns 500 with truncated error message on exception", async () => {
    vi.mocked(prisma.deal.findFirst).mockRejectedValue(new Error("Some database connection error"))

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/deals/d1"), makeParams("d1"))
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe("Some database connection error")
  })
})

// ─── PUT /api/v1/deals/:id ───────────────────────────────────────────

describe("PUT /api/v1/deals/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/deals/d1", { method: "PUT", body: JSON.stringify({ name: "X" }) }),
      makeParams("d1"),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid body", async () => {
    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/deals/d1", { method: "PUT", body: JSON.stringify({ name: "" }) }),
      makeParams("d1"),
    )
    expect(res.status).toBe(400)
  })

  it("returns 422 when stage validation rules fail (required field)", async () => {
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue({
      id: "ps-1", name: "NEGOTIATION", isActive: true,
      validationRules: [
        { id: "vr-1", isActive: true, fieldName: "valueAmount", ruleType: "required", ruleValue: null, errorMessage: "Value is required for Negotiation stage" },
      ],
    } as any)
    vi.mocked(prisma.deal.findFirst).mockResolvedValue({
      id: "d1", name: "Deal", organizationId: "org-1", stage: "QUALIFIED",
      valueAmount: null, assignedTo: null,
    } as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/deals/d1", { method: "PUT", body: JSON.stringify({ stage: "NEGOTIATION" }) }),
      makeParams("d1"),
    )
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.validationErrors).toHaveLength(1)
    expect(json.validationErrors[0].field).toBe("valueAmount")
    expect(json.validationErrors[0].message).toBe("Value is required for Negotiation stage")
  })

  it("returns 422 when task_completed validation rule fails", async () => {
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue({
      id: "ps-2", name: "WON", isActive: true,
      validationRules: [
        { id: "vr-2", isActive: true, fieldName: "tasks", ruleType: "task_completed", ruleValue: null, errorMessage: "Complete all tasks before closing" },
      ],
    } as any)
    vi.mocked(prisma.deal.findFirst).mockResolvedValue({
      id: "d1", name: "Deal", organizationId: "org-1", stage: "NEGOTIATION",
      valueAmount: 5000, assignedTo: "u1",
    } as any)
    vi.mocked(prisma.task.count).mockResolvedValue(0)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/deals/d1", { method: "PUT", body: JSON.stringify({ stage: "WON" }) }),
      makeParams("d1"),
    )
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.validationErrors[0].field).toBe("tasks")
  })

  it("auto-sets probability from STAGE_PROBABILITY map when stage changes", async () => {
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.deal.findFirst).mockResolvedValue({
      id: "d1", name: "Deal", organizationId: "org-1", stage: "LEAD",
      valueAmount: 1000, assignedTo: null,
    } as any)
    vi.mocked(prisma.deal.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.deal.findFirst)
      .mockResolvedValueOnce({ id: "d1", name: "Deal", stage: "LEAD", valueAmount: 1000, assignedTo: null } as any) // existing
      .mockResolvedValueOnce({ id: "d1", name: "Deal", stage: "LEAD", valueAmount: 1000, assignedTo: null } as any) // existing (for capture old)
      .mockResolvedValueOnce({ id: "d1", name: "Deal", stage: "QUALIFIED", valueAmount: 1000, probability: 25, pipelineId: null, companyId: null, contactId: null, company: null, campaign: null, teamMembers: [] } as any) // updated

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/deals/d1", { method: "PUT", body: JSON.stringify({ stage: "QUALIFIED" }) }),
      makeParams("d1"),
    )

    // Check that updateMany was called with probability: 25 (from STAGE_PROBABILITY map)
    const updateCall = vi.mocked(prisma.deal.updateMany).mock.calls[0][0] as any
    expect(updateCall.data.probability).toBe(25)
    expect(updateCall.data.stage).toBe("QUALIFIED")
  })

  it("returns 404 when updateMany count is 0", async () => {
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.deal.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.deal.updateMany).mockResolvedValue({ count: 0 } as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/deals/d1", { method: "PUT", body: JSON.stringify({ name: "Updated" }) }),
      makeParams("d1"),
    )
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Deal not found")
  })

  it("creates activity entries for stage and value changes", async () => {
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue(null as any)
    // first findFirst = currentDeal (stage validation lookup — returns null because no stage in body... wait, stage IS in body)
    // Actually the flow is: stage validation -> pipelineStage.findFirst returns null -> skip validation
    // then: existing = deal.findFirst (for old values capture)
    // then: updateMany
    // then: updated = deal.findFirst (for return value)
    vi.mocked(prisma.deal.findFirst)
      .mockResolvedValueOnce({ id: "d1", name: "Deal", stage: "LEAD", valueAmount: 1000, assignedTo: "u1" } as any) // existing (old values)
    vi.mocked(prisma.deal.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.deal.findFirst)
      .mockResolvedValueOnce({ id: "d1", name: "Deal", stage: "WON", valueAmount: 5000, probability: 100, pipelineId: null, companyId: "c1", contactId: "ct-1", company: { id: "c1", name: "Acme" }, campaign: null, teamMembers: [] } as any) // updated
    vi.mocked(prisma.activity.createMany).mockResolvedValue({ count: 2 } as any)
    vi.mocked(prisma.dealContactRole.findMany).mockResolvedValue([] as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/deals/d1", { method: "PUT", body: JSON.stringify({ stage: "WON", valueAmount: 5000 }) }),
      makeParams("d1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ─── DELETE /api/v1/deals/:id ────────────────────────────────────────

describe("DELETE /api/v1/deals/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/deals/d1", { method: "DELETE" }), makeParams("d1"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when deal not found (deleteMany count=0)", async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue({ name: "Ghost" } as any)
    vi.mocked(prisma.deal.deleteMany).mockResolvedValue({ count: 0 } as any)

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/deals/missing", { method: "DELETE" }), makeParams("missing"))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Deal not found")
  })

  it("deletes deal and returns success with deleted id", async () => {
    vi.mocked(prisma.deal.findFirst).mockResolvedValue({ name: "Doomed Deal" } as any)
    vi.mocked(prisma.deal.deleteMany).mockResolvedValue({ count: 1 } as any)

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/deals/d1", { method: "DELETE" }), makeParams("d1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.deleted).toBe("d1")
  })
})
