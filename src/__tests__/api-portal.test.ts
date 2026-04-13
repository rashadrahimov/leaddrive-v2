import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: vi.fn(), findFirst: vi.fn() },
    contact: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    kbArticle: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    lead: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    landingPage: { findFirst: vi.fn(), update: vi.fn() },
    formSubmission: { create: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/portal-auth", () => ({
  getPortalUser: vi.fn(),
  createPortalToken: vi.fn().mockResolvedValue("mock-jwt-token"),
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashed"),
  },
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/lead-assignment", () => ({
  applyLeadAssignmentRules: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/constants", () => ({
  PAGE_SIZE: { DEFAULT: 50 },
}))

vi.mock("crypto", async () => {
  const actual = await vi.importActual("crypto")
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue({ toString: () => "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" }),
  }
})

// ── Imports ──────────────────────────────────────────────

import { POST as POST_LOGIN, DELETE as DELETE_LOGOUT } from "@/app/api/v1/public/portal-auth/route"
import { POST as POST_REGISTER } from "@/app/api/v1/public/portal-auth/register/route"
import { GET as GET_TICKETS, POST as POST_TICKET } from "@/app/api/v1/public/portal-tickets/route"
import { GET as GET_KB } from "@/app/api/v1/public/portal-kb/route"
import { POST as POST_LEAD, OPTIONS as OPTIONS_LEAD } from "@/app/api/v1/public/leads/route"
import { POST as POST_FORM, OPTIONS as OPTIONS_FORM } from "@/app/api/v1/public/form-submit/route"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"
import bcrypt from "bcryptjs"
import { applyLeadAssignmentRules } from "@/lib/lead-assignment"
import { sendEmail } from "@/lib/email"

const PORTAL_USER = {
  contactId: "contact-1",
  organizationId: "org-1",
  companyId: "comp-1",
  fullName: "John Doe",
  email: "john@acme.com",
}

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// POST /api/v1/public/portal-auth (login)
// ---------------------------------------------------------------------------
describe("POST /api/v1/public/portal-auth (login)", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST_LOGIN(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth", {
        method: "POST",
        body: JSON.stringify({ password: "123" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when password is missing", async () => {
    const res = await POST_LOGIN(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth", {
        method: "POST",
        body: JSON.stringify({ email: "john@test.com" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 401 when organization not found", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)

    const res = await POST_LOGIN(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth", {
        method: "POST",
        body: JSON.stringify({ email: "john@test.com", password: "123", slug: "nonexistent" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 401 when contact not found", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ id: "org-1" } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null)

    const res = await POST_LOGIN(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@test.com", password: "123", slug: "leaddrive" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 403 when portal access is not enabled", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ id: "org-1" } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue({
      id: "c1",
      email: "john@test.com",
      portalAccessEnabled: false,
      portalPasswordHash: "hash",
      organizationId: "org-1",
    } as any)

    const res = await POST_LOGIN(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth", {
        method: "POST",
        body: JSON.stringify({ email: "john@test.com", password: "123", slug: "leaddrive" }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it("returns 401 when password is wrong", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ id: "org-1" } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue({
      id: "c1",
      email: "john@test.com",
      fullName: "John",
      portalAccessEnabled: true,
      portalPasswordHash: "hashedpass",
      organizationId: "org-1",
      company: { name: "Acme" },
    } as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const res = await POST_LOGIN(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth", {
        method: "POST",
        body: JSON.stringify({ email: "john@test.com", password: "wrong", slug: "leaddrive" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns success with token cookie on valid login", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ id: "org-1" } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue({
      id: "c1",
      email: "john@test.com",
      fullName: "John",
      portalAccessEnabled: true,
      portalPasswordHash: "hashedpass",
      organizationId: "org-1",
      companyId: "comp-1",
      company: { name: "Acme" },
    } as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(prisma.contact.update).mockResolvedValue({} as any)
    vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any)

    const res = await POST_LOGIN(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth", {
        method: "POST",
        body: JSON.stringify({ email: "john@test.com", password: "correct", slug: "leaddrive" }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.fullName).toBe("John")
    // Check that portal-token cookie is set
    const setCookie = res.headers.getSetCookie()
    expect(setCookie.some((c: string) => c.includes("portal-token"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/public/portal-auth (logout)
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/public/portal-auth (logout)", () => {
  it("clears the portal-token cookie", async () => {
    const res = await DELETE_LOGOUT()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    const setCookie = res.headers.getSetCookie()
    expect(setCookie.some((c: string) => c.includes("portal-token") && c.includes("Max-Age=0"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/public/portal-auth/register
// ---------------------------------------------------------------------------
describe("POST /api/v1/public/portal-auth/register", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST_REGISTER(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth/register", {
        method: "POST",
        body: JSON.stringify({ slug: "leaddrive" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns generic success even when org not found (prevents enumeration)", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)

    const res = await POST_REGISTER(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "anyone@test.com", slug: "nonexistent" }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("returns generic success when contact not found (prevents enumeration)", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ id: "org-1" } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null)

    const res = await POST_REGISTER(
      makeRequest("http://localhost:3000/api/v1/public/portal-auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "unknown@test.com", slug: "leaddrive" }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/public/portal-tickets
// ---------------------------------------------------------------------------
describe("GET /api/v1/public/portal-tickets", () => {
  it("returns 401 when portal user is not authenticated", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(null)

    const res = await GET_TICKETS()
    expect(res.status).toBe(401)
  })

  it("returns tickets for the portal user", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(PORTAL_USER)
    vi.mocked(prisma.ticket.findMany).mockResolvedValue([
      { id: "t1", ticketNumber: "TK-00001", subject: "Bug", status: "new", priority: "high" },
    ] as any)

    const res = await GET_TICKETS()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].ticketNumber).toBe("TK-00001")
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/public/portal-tickets
// ---------------------------------------------------------------------------
describe("POST /api/v1/public/portal-tickets", () => {
  it("returns 401 when portal user is not authenticated", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(null)

    const res = await POST_TICKET(
      makeRequest("http://localhost:3000/api/v1/public/portal-tickets", {
        method: "POST",
        body: JSON.stringify({ subject: "Help" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when subject is missing", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(PORTAL_USER)

    const res = await POST_TICKET(
      makeRequest("http://localhost:3000/api/v1/public/portal-tickets", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("creates a ticket and returns 201", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(PORTAL_USER)
    vi.mocked(prisma.ticket.count).mockResolvedValue(5)
    vi.mocked(prisma.ticket.create).mockResolvedValue({
      id: "t-new",
      ticketNumber: "TK-00006",
      subject: "Login issue",
      status: "new",
      priority: "medium",
      category: "general",
      organizationId: "org-1",
      contactId: "contact-1",
    } as any)

    const res = await POST_TICKET(
      makeRequest("http://localhost:3000/api/v1/public/portal-tickets", {
        method: "POST",
        body: JSON.stringify({ subject: "Login issue" }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.ticketNumber).toBe("TK-00006")

    const createCall = vi.mocked(prisma.ticket.create).mock.calls[0][0] as any
    expect(createCall.data.contactId).toBe("contact-1")
    expect(createCall.data.status).toBe("new")
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/public/portal-kb
// ---------------------------------------------------------------------------
describe("GET /api/v1/public/portal-kb", () => {
  it("returns 401 when portal user is not authenticated", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(null)

    const res = await GET_KB(
      makeRequest("http://localhost:3000/api/v1/public/portal-kb"),
    )
    expect(res.status).toBe(401)
  })

  it("returns published articles list", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(PORTAL_USER)
    vi.mocked(prisma.kbArticle.findMany).mockResolvedValue([
      { id: "a1", title: "How to reset password", content: "Step 1...", tags: ["auth"], viewCount: 5, createdAt: new Date() },
    ] as any)

    const res = await GET_KB(
      makeRequest("http://localhost:3000/api/v1/public/portal-kb"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].title).toBe("How to reset password")
  })

  it("returns single article and increments viewCount when id param given", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(PORTAL_USER)
    vi.mocked(prisma.kbArticle.findFirst).mockResolvedValue({
      id: "a1",
      title: "Guide",
      content: "Full content here",
      tags: [],
      viewCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationId: "org-1",
      status: "published",
    } as any)
    vi.mocked(prisma.kbArticle.update).mockResolvedValue({} as any)

    const res = await GET_KB(
      makeRequest("http://localhost:3000/api/v1/public/portal-kb?id=a1"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe("Guide")
    expect(body.data.viewCount).toBe(11)
    expect(prisma.kbArticle.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { viewCount: { increment: 1 } } }),
    )
  })

  it("returns 404 when article not found", async () => {
    vi.mocked(getPortalUser).mockResolvedValue(PORTAL_USER)
    vi.mocked(prisma.kbArticle.findFirst).mockResolvedValue(null)

    const res = await GET_KB(
      makeRequest("http://localhost:3000/api/v1/public/portal-kb?id=nonexistent"),
    )
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/public/leads (web-to-lead)
// ---------------------------------------------------------------------------
describe("POST /api/v1/public/leads (web-to-lead)", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await POST_LEAD(
      makeRequest("http://localhost:3000/api/v1/public/leads", {
        method: "POST",
        body: JSON.stringify({ email: "test@test.com" }),
      }) as any,
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  it("returns 201 even when org not found (prevents enumeration)", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue(null)

    const res = await POST_LEAD(
      makeRequest("http://localhost:3000/api/v1/public/leads", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane",
          email: "jane@test.com",
          org_slug: "nonexistent",
        }),
      }) as any,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("creates a lead and calls assignment rules", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ id: "org-1" } as any)
    const createdLead = {
      id: "lead-new",
      contactName: "Jane",
      email: "jane@test.com",
      status: "new",
      organizationId: "org-1",
    }
    vi.mocked(prisma.lead.create).mockResolvedValue(createdLead as any)

    const res = await POST_LEAD(
      makeRequest("http://localhost:3000/api/v1/public/leads", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane",
          email: "jane@test.com",
          org_slug: "leaddrive",
        }),
      }) as any,
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.email).toBe("jane@test.com")
    expect(applyLeadAssignmentRules).toHaveBeenCalledWith("org-1", createdLead)
  })

  it("OPTIONS returns CORS headers", async () => {
    const res = await OPTIONS_LEAD()
    expect(res.status).toBe(204)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST")
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/public/form-submit
// ---------------------------------------------------------------------------
describe("POST /api/v1/public/form-submit", () => {
  it("returns 400 when pageId is missing", async () => {
    const res = await POST_FORM(
      makeRequest("http://localhost:3000/api/v1/public/form-submit", {
        method: "POST",
        body: JSON.stringify({ orgId: "org-1" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when orgId is missing", async () => {
    const res = await POST_FORM(
      makeRequest("http://localhost:3000/api/v1/public/form-submit", {
        method: "POST",
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when landing page not found or not published", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue(null)

    const res = await POST_FORM(
      makeRequest("http://localhost:3000/api/v1/public/form-submit", {
        method: "POST",
        body: JSON.stringify({ pageId: "page-1", orgId: "org-1", name: "Test" }),
      }),
    )
    expect(res.status).toBe(404)
  })

  it("creates submission + lead in a transaction and returns 201", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({
      id: "page-1",
      name: "Landing 1",
      organizationId: "org-1",
      status: "published",
    } as any)

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
      const tx = {
        formSubmission: {
          create: vi.fn().mockResolvedValue({ id: "sub-1" }),
          update: vi.fn().mockResolvedValue({}),
        },
        lead: {
          create: vi.fn().mockResolvedValue({ id: "lead-1", contactName: "Alice" }),
        },
        landingPage: {
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(tx)
    })

    const res = await POST_FORM(
      makeRequest("http://localhost:3000/api/v1/public/form-submit", {
        method: "POST",
        body: JSON.stringify({
          pageId: "page-1",
          orgId: "org-1",
          name: "Alice",
          email: "alice@test.com",
        }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("OPTIONS returns CORS headers", async () => {
    const res = await OPTIONS_FORM()
    expect(res.status).toBe(204)
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*")
  })
})
