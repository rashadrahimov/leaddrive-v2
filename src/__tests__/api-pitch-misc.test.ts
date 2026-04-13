import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pitchToken: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    pipelineStage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    stageValidationRule: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    deal: { count: vi.fn(), findMany: vi.fn() },
    salesQuota: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contact: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    planRequest: { findMany: vi.fn(), create: vi.fn() },
    priceChange: { findMany: vi.fn(), count: vi.fn(), createMany: vi.fn() },
    pricingProfile: { findMany: vi.fn() },
    organization: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    aiChatSession: { findMany: vi.fn(), deleteMany: vi.fn() },
    aiChatMessage: { deleteMany: vi.fn() },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
  requireAuth: vi.fn(),
  isAuthError: vi.fn().mockReturnValue(false),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "u1" } }),
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/constants", () => ({
  DEFAULT_PIPELINE_STAGES: [
    { name: "lead", displayName: "Lead", color: "#ccc", probability: 10, sortOrder: 1 },
  ],
  STAGE_COLORS: { LEAD: "#ccc" },
  DEFAULT_CURRENCY: "AZN",
  isManagerOrAbove: vi.fn().mockReturnValue(true),
  isAdmin: vi.fn().mockReturnValue(true),
  PAGE_SIZE: { DEFAULT: 50, PORTAL_USERS: 100 },
}))

vi.mock("@/lib/pricing", () => ({
  applyAdjustments: vi.fn().mockReturnValue({}),
}))

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal() as any
  return { ...actual, readFileSync: vi.fn().mockReturnValue("") }
})

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { GET as pitchTokensGET, POST as pitchTokensPOST } from "@/app/api/v1/pitch-tokens/route"
import { DELETE as pitchTokenDELETE } from "@/app/api/v1/pitch-tokens/[id]/route"
import { GET as pitchGET } from "@/app/api/v1/pitch/[token]/route"
import { POST as pitchBurnPOST } from "@/app/api/v1/pitch/[token]/burn/route"
import { GET as pitchPresentationGET } from "@/app/api/v1/pitch/presentation/route"
import { GET as stagesGET, POST as stagesPOST } from "@/app/api/v1/pipeline-stages/route"
import { PATCH as stagePATCH, DELETE as stageDELETE } from "@/app/api/v1/pipeline-stages/[id]/route"
import { GET as stageRulesGET, POST as stageRulesPOST } from "@/app/api/v1/pipeline-stages/[id]/rules/route"
import { GET as quotasGET, POST as quotasPOST } from "@/app/api/v1/sales-quotas/route"
import { PATCH as quotaPATCH, DELETE as quotaDELETE } from "@/app/api/v1/sales-quotas/[id]/route"
import { GET as planReqGET, POST as planReqPOST } from "@/app/api/v1/plan-requests/route"
import { GET as portalUsersGET } from "@/app/api/v1/portal-users/route"
import { GET as priceChangesGET } from "@/app/api/v1/price-changes/route"
import { POST as priceChangesBatchPOST } from "@/app/api/v1/price-changes/batch/route"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession, requireAuth } from "@/lib/api-auth"

function jsonReq(url: string, body: any, headers?: Record<string, string>) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  })
}

const params = (v: string, key = "id") => ({ params: Promise.resolve({ [key]: v }) })

/* ================================================================== */
/*  Pitch Tokens                                                       */
/* ================================================================== */

describe("Pitch Tokens — /api/v1/pitch-tokens", () => {
  beforeEach(() => vi.clearAllMocks())

  it("GET returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await pitchTokensGET(new NextRequest("http://localhost/api/v1/pitch-tokens"))
    expect(res.status).toBe(401)
  })

  it("GET lists tokens", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.pitchToken.findMany).mockResolvedValue([{ id: "t1", token: "abc" }] as any)
    const res = await pitchTokensGET(new NextRequest("http://localhost/api/v1/pitch-tokens"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("POST returns 400 when guestName missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await pitchTokensPOST(jsonReq("http://localhost/api/v1/pitch-tokens", {}))
    expect(res.status).toBe(400)
  })

  it("POST creates token and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.pitchToken.create).mockResolvedValue({ id: "t1", token: "uuid-1", guestName: "John" } as any)
    const res = await pitchTokensPOST(jsonReq("http://localhost/api/v1/pitch-tokens", { guestName: "John" }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.url).toContain("/pitch/")
  })

  it("DELETE removes token", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.pitchToken.deleteMany).mockResolvedValue({ count: 1 } as any)
    const req = new NextRequest("http://localhost/api/v1/pitch-tokens/t1", { method: "DELETE" })
    const res = await pitchTokenDELETE(req, params("t1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ================================================================== */
/*  Pitch [token] GET + burn                                           */
/* ================================================================== */

describe("Pitch [token] — /api/v1/pitch/[token]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("GET returns valid:false when token not found", async () => {
    vi.mocked(prisma.pitchToken.findUnique).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/v1/pitch/abc")
    const res = await pitchGET(req, params("abc", "token"))
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toBe("not_found")
  })

  it("GET returns valid:false when token already used", async () => {
    vi.mocked(prisma.pitchToken.findUnique).mockResolvedValue({ id: "t1", used: true } as any)
    const req = new NextRequest("http://localhost/api/v1/pitch/abc")
    const res = await pitchGET(req, params("abc", "token"))
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.reason).toBe("used")
  })

  it("GET returns valid:true for fresh token", async () => {
    vi.mocked(prisma.pitchToken.findUnique).mockResolvedValue({ id: "t1", used: false, guestName: "Jane", viewedAt: null } as any)
    vi.mocked(prisma.pitchToken.update).mockResolvedValue({} as any)
    const req = new NextRequest("http://localhost/api/v1/pitch/abc")
    const res = await pitchGET(req, params("abc", "token"))
    const json = await res.json()
    expect(json.valid).toBe(true)
    expect(json.guestName).toBe("Jane")
  })

  it("POST burn marks token used", async () => {
    vi.mocked(prisma.pitchToken.updateMany).mockResolvedValue({ count: 1 } as any)
    const req = new NextRequest("http://localhost/api/v1/pitch/abc/burn", { method: "POST" })
    const res = await pitchBurnPOST(req, params("abc", "token"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ================================================================== */
/*  Pitch Presentation                                                 */
/* ================================================================== */

describe("Pitch Presentation — GET /api/v1/pitch/presentation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 403 when referer does not contain /pitch/", async () => {
    const req = new NextRequest("http://localhost/api/v1/pitch/presentation", {
      headers: { referer: "http://localhost/dashboard" },
    })
    const res = await pitchPresentationGET(req)
    expect(res.status).toBe(403)
  })
})

/* ================================================================== */
/*  Pipeline Stages                                                    */
/* ================================================================== */

describe("Pipeline Stages — /api/v1/pipeline-stages", () => {
  beforeEach(() => vi.clearAllMocks())

  it("GET returns stages list", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.pipelineStage.findMany).mockResolvedValue([{ id: "ps1", name: "lead" }] as any)
    const req = new NextRequest("http://localhost/api/v1/pipeline-stages")
    const res = await stagesGET(req)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("POST creates a stage (201)", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1", role: "admin" } as any)
    vi.mocked(prisma.pipelineStage.create).mockResolvedValue({ id: "ps1", name: "new" } as any)
    const res = await stagesPOST(jsonReq("http://localhost/api/v1/pipeline-stages", { name: "new", displayName: "New Stage" }))
    expect(res.status).toBe(201)
  })

  it("PATCH updates a stage", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue({ id: "ps1" } as any)
    vi.mocked(prisma.pipelineStage.update).mockResolvedValue({ id: "ps1", displayName: "Renamed" } as any)
    const req = jsonReq("http://localhost/api/v1/pipeline-stages/ps1", { displayName: "Renamed" })
    const res = await stagePATCH(req, params("ps1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("DELETE returns 404 when not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.pipelineStage.findFirst).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/v1/pipeline-stages/ps1", { method: "DELETE" })
    const res = await stageDELETE(req, params("ps1"))
    expect(res.status).toBe(404)
  })
})

/* ================================================================== */
/*  Stage Validation Rules                                             */
/* ================================================================== */

describe("Stage Rules — /api/v1/pipeline-stages/[id]/rules", () => {
  beforeEach(() => vi.clearAllMocks())

  it("GET lists rules for a stage", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.stageValidationRule.findMany).mockResolvedValue([{ id: "r1" }] as any)
    const req = new NextRequest("http://localhost/api/v1/pipeline-stages/ps1/rules")
    const res = await stageRulesGET(req, params("ps1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("POST returns 400 when required fields missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const req = jsonReq("http://localhost/api/v1/pipeline-stages/ps1/rules", { fieldName: "amount" })
    const res = await stageRulesPOST(req, params("ps1"))
    expect(res.status).toBe(400)
  })
})

/* ================================================================== */
/*  Sales Quotas                                                       */
/* ================================================================== */

describe("Sales Quotas — /api/v1/sales-quotas", () => {
  beforeEach(() => vi.clearAllMocks())

  it("GET returns 401 when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/v1/sales-quotas")
    const res = await quotasGET(req)
    expect(res.status).toBe(401)
  })

  it("POST creates or upserts a quota", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: "org-1", role: "admin" } as any)
    vi.mocked(prisma.salesQuota.upsert).mockResolvedValue({ id: "q1" } as any)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([])
    const res = await quotasPOST(jsonReq("http://localhost/api/v1/sales-quotas", {
      userId: "u1", year: 2026, quarter: 1, amount: 50000,
    }))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("DELETE returns 404 when quota not found", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: "org-1", role: "admin" } as any)
    vi.mocked(prisma.salesQuota.findFirst).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/v1/sales-quotas/q1", { method: "DELETE" })
    const res = await quotaDELETE(req, params("q1"))
    expect(res.status).toBe(404)
  })
})

/* ================================================================== */
/*  Plan Requests                                                      */
/* ================================================================== */

describe("Plan Requests — /api/v1/plan-requests", () => {
  beforeEach(() => vi.clearAllMocks())

  it("GET lists plan requests", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.planRequest.findMany).mockResolvedValue([{ id: "pr1" }] as any)
    const req = new NextRequest("http://localhost/api/v1/plan-requests")
    const res = await planReqGET(req)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("POST returns 400 for invalid body", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await planReqPOST(jsonReq("http://localhost/api/v1/plan-requests", { requestedPlan: "" }))
    expect(res.status).toBe(400)
  })
})

/* ================================================================== */
/*  Portal Users                                                       */
/* ================================================================== */

describe("Portal Users — GET /api/v1/portal-users", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const req = new NextRequest("http://localhost/api/v1/portal-users")
    const res = await portalUsersGET(req)
    expect(res.status).toBe(401)
  })

  it("returns contacts and stats", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.contact.findMany)
      .mockResolvedValueOnce([{ id: "c1", fullName: "Test", email: "a@b.com", portalAccessEnabled: true, portalPasswordHash: null, company: null }] as any)
      .mockResolvedValueOnce([{ portalAccessEnabled: true, portalPasswordHash: null, portalLastLoginAt: null }] as any)
    const req = new NextRequest("http://localhost/api/v1/portal-users")
    const res = await portalUsersGET(req)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.contacts).toHaveLength(1)
    expect(json.data.stats).toBeDefined()
  })
})

/* ================================================================== */
/*  Price Changes                                                      */
/* ================================================================== */

describe("Price Changes — /api/v1/price-changes", () => {
  beforeEach(() => vi.clearAllMocks())

  it("GET returns paginated price changes", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.priceChange.findMany).mockResolvedValue([{ id: "pc1" }] as any)
    vi.mocked(prisma.priceChange.count).mockResolvedValue(1)
    const req = new NextRequest("http://localhost/api/v1/price-changes?page=1&limit=10")
    const res = await priceChangesGET(req)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.total).toBe(1)
  })

  it("Batch POST returns 400 when companies empty", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await priceChangesBatchPOST(jsonReq("http://localhost/api/v1/price-changes/batch", {
      companies: [],
      adjustments: {},
      notes: "",
    }))
    expect(res.status).toBe(400)
  })
})
