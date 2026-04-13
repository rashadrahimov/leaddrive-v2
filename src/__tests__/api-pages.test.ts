import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    landingPage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pageView: { findMany: vi.fn() },
    formSubmission: { findMany: vi.fn() },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({ getSession: vi.fn(), getOrgId: vi.fn() }))

import { GET, POST } from "@/app/api/v1/pages/route"
import { GET as GET_BY_ID, PUT, DELETE } from "@/app/api/v1/pages/[id]/route"
import { GET as GET_ANALYTICS } from "@/app/api/v1/pages/[id]/analytics/route"
import { POST as PUBLISH } from "@/app/api/v1/pages/[id]/publish/route"
import { GET as GET_SUBMISSIONS } from "@/app/api/v1/pages/submissions/route"
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
})

// ─── GET /api/v1/pages ──────────────────────────────────────────────

describe("GET /api/v1/pages", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET(makeReq("http://localhost:3000/api/v1/pages"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns pages list with search and status filters", async () => {
    const mockPages = [
      { id: "p1", name: "Landing 1", slug: "landing-1", description: null, status: "published", publishedAt: new Date(), totalViews: 10, totalSubmissions: 2, metaTitle: null, createdBy: "user-1", createdAt: new Date(), updatedAt: new Date() },
    ]
    vi.mocked(prisma.landingPage.findMany).mockResolvedValue(mockPages as any)

    const res = await GET(makeReq("http://localhost:3000/api/v1/pages?search=landing&status=published"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.pages).toHaveLength(1)
    expect(json.data).toHaveLength(1)

    const call = vi.mocked(prisma.landingPage.findMany).mock.calls[0][0] as any
    expect(call.where.organizationId).toBe("org-1")
    expect(call.where.OR).toBeDefined()
    expect(call.where.status).toBe("published")
  })
})

// ─── POST /api/v1/pages ─────────────────────────────────────────────

describe("POST /api/v1/pages", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/pages", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "test" }),
    }))
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid slug format", async () => {
    const res = await POST(makeReq("http://localhost:3000/api/v1/pages", {
      method: "POST",
      body: JSON.stringify({ name: "Test", slug: "INVALID SLUG!" }),
    }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Slug must be lowercase")
  })

  it("returns 409 when slug already in use", async () => {
    vi.mocked(prisma.landingPage.findUnique).mockResolvedValue({ id: "existing" } as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/pages", {
      method: "POST",
      body: JSON.stringify({ name: "New Page", slug: "taken-slug" }),
    }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe("Slug already in use")
  })

  it("creates page and returns 201", async () => {
    vi.mocked(prisma.landingPage.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.landingPage.create).mockResolvedValue({
      id: "p-new", name: "New Page", slug: "new-page", organizationId: "org-1",
    } as any)

    const res = await POST(makeReq("http://localhost:3000/api/v1/pages", {
      method: "POST",
      body: JSON.stringify({ name: "New Page", slug: "new-page", description: "A page" }),
    }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("p-new")
  })
})

// ─── GET /api/v1/pages/:id ──────────────────────────────────────────

describe("GET /api/v1/pages/:id", () => {
  it("returns 404 when page not found", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue(null)

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/pages/missing"), makeParams("missing"))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Page not found")
  })

  it("returns page by id", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({ id: "p1", name: "My Page", slug: "my-page" } as any)

    const res = await GET_BY_ID(makeReq("http://localhost:3000/api/v1/pages/p1"), makeParams("p1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("p1")
  })
})

// ─── PUT /api/v1/pages/:id ──────────────────────────────────────────

describe("PUT /api/v1/pages/:id", () => {
  it("returns 404 when page not found", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue(null)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/pages/missing", { method: "PUT", body: JSON.stringify({ name: "X" }) }),
      makeParams("missing"),
    )
    expect(res.status).toBe(404)
  })

  it("returns 409 when changing slug to an already-used one", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({ id: "p1", slug: "old-slug" } as any)
    vi.mocked(prisma.landingPage.findUnique).mockResolvedValue({ id: "p-other" } as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/pages/p1", { method: "PUT", body: JSON.stringify({ slug: "taken-slug" }) }),
      makeParams("p1"),
    )
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe("Slug already in use")
  })

  it("updates page and returns success", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({ id: "p1", slug: "my-page" } as any)
    vi.mocked(prisma.landingPage.update).mockResolvedValue({ id: "p1", name: "Updated", slug: "my-page" } as any)

    const res = await PUT(
      makeReq("http://localhost:3000/api/v1/pages/p1", { method: "PUT", body: JSON.stringify({ name: "Updated" }) }),
      makeParams("p1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("Updated")
  })
})

// ─── DELETE /api/v1/pages/:id ───────────────────────────────────────

describe("DELETE /api/v1/pages/:id", () => {
  it("returns 404 when page not found", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue(null)

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/pages/missing", { method: "DELETE" }), makeParams("missing"))
    expect(res.status).toBe(404)
  })

  it("deletes page and returns success", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({ id: "p1" } as any)
    vi.mocked(prisma.landingPage.delete).mockResolvedValue({ id: "p1" } as any)

    const res = await DELETE(makeReq("http://localhost:3000/api/v1/pages/p1", { method: "DELETE" }), makeParams("p1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ─── GET /api/v1/pages/:id/analytics ────────────────────────────────

describe("GET /api/v1/pages/:id/analytics", () => {
  it("returns 404 when page not found", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue(null)

    const res = await GET_ANALYTICS(makeReq("http://localhost:3000/api/v1/pages/missing/analytics"), makeParams("missing"))
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe("Not found")
  })

  it("returns chart data with 30-day view and submission counts", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({ id: "p1", totalViews: 100, totalSubmissions: 5 } as any)
    vi.mocked(prisma.pageView.findMany).mockResolvedValue([
      { createdAt: new Date() },
      { createdAt: new Date() },
    ] as any)
    vi.mocked(prisma.formSubmission.findMany).mockResolvedValue([
      { createdAt: new Date() },
    ] as any)

    const res = await GET_ANALYTICS(makeReq("http://localhost:3000/api/v1/pages/p1/analytics"), makeParams("p1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.chartData).toHaveLength(30)
    expect(json.data.totalViews).toBe(100)
    expect(json.data.totalSubmissions).toBe(5)
  })
})

// ─── POST /api/v1/pages/:id/publish ─────────────────────────────────

describe("POST /api/v1/pages/:id/publish", () => {
  it("returns 404 when page not found", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue(null)

    const res = await PUBLISH(makeReq("http://localhost:3000/api/v1/pages/missing/publish", { method: "POST" }), makeParams("missing"))
    expect(res.status).toBe(404)
  })

  it("publishes page (sets status to published)", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({ id: "p1", status: "draft" } as any)
    vi.mocked(prisma.landingPage.update).mockResolvedValue({ id: "p1", status: "published", publishedAt: new Date() } as any)

    const res = await PUBLISH(
      makeReq("http://localhost:3000/api/v1/pages/p1/publish", { method: "POST", body: JSON.stringify({}) }),
      makeParams("p1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.status).toBe("published")
  })

  it("unpublishes page when unpublish=true", async () => {
    vi.mocked(prisma.landingPage.findFirst).mockResolvedValue({ id: "p1", status: "published" } as any)
    vi.mocked(prisma.landingPage.update).mockResolvedValue({ id: "p1", status: "draft" } as any)

    const res = await PUBLISH(
      makeReq("http://localhost:3000/api/v1/pages/p1/publish", { method: "POST", body: JSON.stringify({ unpublish: true }) }),
      makeParams("p1"),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.status).toBe("draft")
  })
})

// ─── GET /api/v1/pages/submissions ──────────────────────────────────

describe("GET /api/v1/pages/submissions", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_SUBMISSIONS(makeReq("http://localhost:3000/api/v1/pages/submissions"))
    expect(res.status).toBe(401)
  })

  it("returns submissions with optional pageId filter", async () => {
    const mockSubs = [
      { id: "s1", data: { name: "John" }, landingPage: { name: "Landing 1", slug: "landing-1" }, createdAt: new Date() },
    ]
    vi.mocked(prisma.formSubmission.findMany).mockResolvedValue(mockSubs as any)

    const res = await GET_SUBMISSIONS(makeReq("http://localhost:3000/api/v1/pages/submissions?pageId=p1&limit=10"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.submissions).toHaveLength(1)
    expect(json.data).toHaveLength(1)

    const call = vi.mocked(prisma.formSubmission.findMany).mock.calls[0][0] as any
    expect(call.where.organizationId).toBe("org-1")
    expect(call.where.landingPageId).toBe("p1")
    expect(call.take).toBe(10)
  })
})
