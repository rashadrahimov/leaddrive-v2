import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ticket: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    company: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    contact: {
      findFirst: vi.fn(),
    },
    slaPolicy: {
      findFirst: vi.fn(),
    },
    channelConfig: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    channelMessage: {
      findFirst: vi.fn(),
    },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getSession: vi.fn(),
  getOrgId: vi.fn(),
  requireAuth: vi.fn(),
  isAuthError: vi.fn().mockImplementation((result: any) => result instanceof NextResponse),
}))

vi.mock("@/lib/field-filter", () => ({
  getFieldPermissions: vi.fn().mockResolvedValue([]),
  filterEntityFields: vi.fn().mockImplementation((data: any) => data),
  filterWritableFields: vi.fn().mockImplementation((data: any) => data),
}))

vi.mock("@/lib/sharing-rules", () => ({
  applyRecordFilter: vi.fn().mockImplementation((_o: any, _u: any, _r: any, _e: any, where: any) => where),
}))

vi.mock("@/lib/workflow-engine", () => ({
  executeWorkflows: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/auto-assign", () => ({
  autoAssignTicket: vi.fn().mockResolvedValue({ assigned: false }),
}))

vi.mock("@/lib/webhooks", () => ({
  fireWebhooks: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/contact-events", () => ({
  trackContactEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/slack", () => ({
  sendSlackNotification: vi.fn().mockResolvedValue(undefined),
  formatTicketNotification: vi.fn().mockReturnValue("slack msg"),
}))

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
}))

import { GET, POST } from "@/app/api/v1/tickets/route"
import { GET as GET_BY_ID, PUT, DELETE, PATCH } from "@/app/api/v1/tickets/[id]/route"
import { prisma } from "@/lib/prisma"
import { getSession, getOrgId, requireAuth } from "@/lib/api-auth"
import { autoAssignTicket } from "@/lib/auto-assign"
import { fireWebhooks } from "@/lib/webhooks"
import { createNotification } from "@/lib/notifications"

const SESSION = { orgId: "org-1", userId: "user-1", role: "admin", email: "a@b.com", name: "Test" }

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
// GET /api/v1/tickets
// ---------------------------------------------------------------------------
describe("GET /api/v1/tickets", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET(makeRequest("http://localhost/api/v1/tickets"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns tickets with pagination defaults", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const mockTickets = [{ id: "tk1", subject: "Help", companyId: null, assignedTo: null }]
    vi.mocked(prisma.ticket.findMany).mockResolvedValue(mockTickets as any)
    vi.mocked(prisma.ticket.count).mockResolvedValue(1)

    const res = await GET(makeRequest("http://localhost/api/v1/tickets"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tickets).toHaveLength(1)
    expect(body.data.total).toBe(1)
    expect(body.data.page).toBe(1)
    expect(body.data.limit).toBe(50)
  })

  it("applies status and companyId filters", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([])
    vi.mocked(prisma.ticket.count).mockResolvedValue(0)

    await GET(makeRequest("http://localhost/api/v1/tickets?status=open&companyId=comp-1"))

    const call = vi.mocked(prisma.ticket.findMany).mock.calls[0][0] as any
    expect(call.where.status).toBe("open")
    expect(call.where.companyId).toBe("comp-1")
  })

  it("resolves companyName and assigneeName", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const mockTickets = [{ id: "tk1", subject: "X", companyId: "c1", assignedTo: "u1" }]
    vi.mocked(prisma.ticket.findMany).mockResolvedValue(mockTickets as any)
    vi.mocked(prisma.ticket.count).mockResolvedValue(1)
    vi.mocked(prisma.company.findMany).mockResolvedValue([{ id: "c1", name: "Acme" }] as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "u1", name: "Agent", email: "a@b.com" }] as any)

    const res = await GET(makeRequest("http://localhost/api/v1/tickets"))
    const body = await res.json()
    expect(body.data.tickets[0].companyName).toBe("Acme")
    expect(body.data.tickets[0].assigneeName).toBe("Agent")
  })

  it("returns 500 on database error", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findMany).mockRejectedValue(new Error("DB down"))

    const res = await GET(makeRequest("http://localhost/api/v1/tickets"))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Internal server error")
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/tickets
// ---------------------------------------------------------------------------
describe("POST /api/v1/tickets", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST(makeRequest("http://localhost/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject: "Test" }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when subject is missing", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)

    const res = await POST(makeRequest("http://localhost/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({}),
    }))
    expect(res.status).toBe(400)
  })

  it("creates ticket with auto-generated ticket number", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([
      { ticketNumber: "TK-0003" },
    ] as any)
    const created = { id: "tk-new", subject: "New", ticketNumber: "TK-0004", priority: "medium", status: "new", category: "general", assignedTo: null, contactId: null }
    vi.mocked(prisma.ticket.create).mockResolvedValue(created as any)

    const res = await POST(makeRequest("http://localhost/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject: "New" }),
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("tk-new")

    const createCall = vi.mocked(prisma.ticket.create).mock.calls[0][0] as any
    expect(createCall.data.ticketNumber).toBe("TK-0004")
  })

  it("auto-assigns ticket when no assignedTo provided", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([])
    const created = { id: "tk-aa", subject: "Auto", ticketNumber: "TK-0001", priority: "medium", status: "new", category: "technical", assignedTo: null, contactId: null }
    vi.mocked(prisma.ticket.create).mockResolvedValue(created as any)
    vi.mocked(autoAssignTicket).mockResolvedValue({ assigned: true, agentId: "agent-1", agentName: "Agent", queueName: "Q1" } as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ ...created, assignedTo: "agent-1" } as any)

    await POST(makeRequest("http://localhost/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject: "Auto", category: "technical" }),
    }))

    expect(autoAssignTicket).toHaveBeenCalledWith("tk-aa", "org-1", "technical")
  })

  it("fires webhooks and notifications on creation", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([])
    const created = { id: "tk-n", subject: "Notif", ticketNumber: "TK-0001", priority: "critical", status: "new", category: "general", assignedTo: "user-2", contactId: null }
    vi.mocked(prisma.ticket.create).mockResolvedValue(created as any)

    await POST(makeRequest("http://localhost/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject: "Notif", priority: "critical", assignedTo: "user-2" }),
    }))

    expect(fireWebhooks).toHaveBeenCalledWith("org-1", "ticket.created", expect.objectContaining({ id: "tk-n" }))
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: "error",
      userId: "user-2",
    }))
  })

  it("applies SLA due dates from slaPolicy", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([])
    vi.mocked(prisma.slaPolicy.findFirst).mockResolvedValue({
      id: "sla-1", name: "Standard", resolutionHours: 24, firstResponseHours: 4, priority: "medium", isActive: true,
    } as any)
    const created = { id: "tk-sla", subject: "SLA Test", ticketNumber: "TK-0001", priority: "medium", status: "new", category: "general", assignedTo: null, contactId: null }
    vi.mocked(prisma.ticket.create).mockResolvedValue(created as any)

    await POST(makeRequest("http://localhost/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject: "SLA Test" }),
    }))

    const createCall = vi.mocked(prisma.ticket.create).mock.calls[0][0] as any
    expect(createCall.data.slaDueAt).toBeInstanceOf(Date)
    expect(createCall.data.slaFirstResponseDueAt).toBeInstanceOf(Date)
    expect(createCall.data.slaPolicyName).toBe("Standard")
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/tickets/:id
// ---------------------------------------------------------------------------
describe("GET /api/v1/tickets/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/tickets/tk1"), makeParams("tk1"))
    expect(res.status).toBe(401)
  })

  it("returns ticket with enriched comments", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const ticket = {
      id: "tk1", subject: "Issue", organizationId: "org-1",
      companyId: "c1", contactId: "ct1", assignedTo: "u1", createdBy: "u1",
      comments: [{ id: "cm1", userId: "u1", createdAt: new Date() }],
    }
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(ticket as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: "u1", name: "Agent", email: "a@b.com" }] as any)
    vi.mocked(prisma.company.findFirst).mockResolvedValue({ id: "c1", name: "Acme" } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue({ id: "ct1", fullName: "John", email: "j@b.com" } as any)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/tickets/tk1"), makeParams("tk1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.companyName).toBe("Acme")
    expect(body.data.assigneeName).toBe("Agent")
    expect(body.data.comments[0].userName).toBe("Agent")
  })

  it("returns 404 when ticket not found", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/tickets/nope"), makeParams("nope"))
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/v1/tickets/:id
// ---------------------------------------------------------------------------
describe("PUT /api/v1/tickets/:id", () => {
  it("returns auth error when requireAuth fails", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any
    )

    const res = await PUT(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "PUT", body: JSON.stringify({ subject: "X" }) }),
      makeParams("tk1")
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when ticket not found", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null)

    const res = await PUT(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "PUT", body: JSON.stringify({ subject: "X" }) }),
      makeParams("tk1")
    )
    expect(res.status).toBe(404)
  })

  it("updates ticket and sets resolvedAt on status=resolved", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const original = { id: "tk1", subject: "Old", status: "open", priority: "medium", organizationId: "org-1", tags: [] }
    vi.mocked(prisma.ticket.findFirst)
      .mockResolvedValueOnce(original as any)
      .mockResolvedValueOnce({ ...original, status: "resolved", resolvedAt: new Date() } as any)
    vi.mocked(prisma.ticket.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await PUT(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "PUT", body: JSON.stringify({ status: "resolved" }) }),
      makeParams("tk1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    const updateCall = vi.mocked(prisma.ticket.updateMany).mock.calls[0][0] as any
    expect(updateCall.data.resolvedAt).toBeInstanceOf(Date)
  })

  it("increments escalationLevel when priority changed to critical", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const original = { id: "tk1", subject: "Esc", status: "open", priority: "high", escalationLevel: 1, organizationId: "org-1", tags: [] }
    vi.mocked(prisma.ticket.findFirst)
      .mockResolvedValueOnce(original as any)
      .mockResolvedValueOnce({ ...original, priority: "critical", escalationLevel: 2 } as any)
    vi.mocked(prisma.ticket.updateMany).mockResolvedValue({ count: 1 } as any)

    await PUT(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "PUT", body: JSON.stringify({ priority: "critical" }) }),
      makeParams("tk1")
    )

    const updateCall = vi.mocked(prisma.ticket.updateMany).mock.calls[0][0] as any
    expect(updateCall.data.escalationLevel).toBe(2)
    expect(updateCall.data.lastEscalatedAt).toBeInstanceOf(Date)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/tickets/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/tickets/:id", () => {
  it("returns auth error when requireAuth fails", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Forbidden" }, { status: 403 }) as any
    )

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "DELETE" }),
      makeParams("tk1")
    )
    expect(res.status).toBe(403)
  })

  it("deletes a ticket successfully", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ subject: "Gone" } as any)
    vi.mocked(prisma.ticket.deleteMany).mockResolvedValue({ count: 1 } as any)

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "DELETE" }),
      makeParams("tk1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.deleted).toBe("tk1")
    expect(fireWebhooks).toHaveBeenCalledWith("org-1", "ticket.deleted", expect.objectContaining({ id: "tk1" }))
  })

  it("returns 404 when ticket not found for deletion", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.ticket.deleteMany).mockResolvedValue({ count: 0 } as any)

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "DELETE" }),
      makeParams("tk1")
    )
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/tickets/:id (auto-assign)
// ---------------------------------------------------------------------------
describe("PATCH /api/v1/tickets/:id", () => {
  it("auto-assigns a ticket via skill-based routing", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: "tk1", category: "technical", organizationId: "org-1" } as any)
    vi.mocked(autoAssignTicket).mockResolvedValue({ assigned: true, agentId: "agent-1", agentName: "Bob", queueName: "Tech" } as any)

    const res = await PATCH(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "PATCH" }),
      makeParams("tk1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.assignedTo).toBe("agent-1")
    expect(body.data.assigneeName).toBe("Bob")
  })

  it("returns 400 when no agents available", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue({ id: "tk1", category: "general", organizationId: "org-1" } as any)
    vi.mocked(autoAssignTicket).mockResolvedValue({ assigned: false } as any)

    const res = await PATCH(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "PATCH" }),
      makeParams("tk1")
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("No available agents")
  })

  it("returns 404 when ticket not found for auto-assign", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1" } as any)
    vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null)

    const res = await PATCH(
      makeRequest("http://localhost/api/v1/tickets/tk1", { method: "PATCH" }),
      makeParams("tk1")
    )
    expect(res.status).toBe(404)
  })
})
