import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiInteractionLog: { create: vi.fn() },
    lead: { findFirst: vi.fn() },
    company: { findFirst: vi.fn() },
    activity: { findMany: vi.fn() },
    deal: { findMany: vi.fn(), count: vi.fn() },
    company: { count: vi.fn(), findFirst: vi.fn() },
    ticket: { count: vi.fn() },
    lead: { count: vi.fn(), findFirst: vi.fn() },
    aiChatSession: { findMany: vi.fn() },
    aiAgentConfig: { findMany: vi.fn(), create: vi.fn() },
    agentHandoff: { create: vi.fn() },
    product: { findMany: vi.fn() },
    contact: { findFirst: vi.fn() },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getSession: vi.fn(),
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  RATE_LIMIT_CONFIG: { ai: { maxRequests: 20, windowMs: 60000 } },
}))

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: '{"score":75,"sentiment":"POSITIVE","emoji":"😊","trend":"stable","risk":"LOW","confidence":80,"summary":"Good"}' }],
          usage: { input_tokens: 100, output_tokens: 50 },
        }),
      },
    })),
  }
})

vi.mock("@/lib/ai/tools", () => ({
  CRM_TOOLS: [],
  TOOL_META: {},
  getEnabledTools: vi.fn().mockReturnValue([]),
  getEnabledToolsForAgent: vi.fn().mockReturnValue([]),
}))

vi.mock("@/lib/ai/tool-executor", () => ({
  executeTool: vi.fn(),
}))

vi.mock("@/lib/ai/predictive", () => ({
  predictDealWin: vi.fn().mockResolvedValue({ winProbability: 50, confidence: 60, riskFactors: [] }),
}))

vi.mock("@/lib/ai/next-best-action", () => ({
  generateNextBestActions: vi.fn().mockResolvedValue([]),
}))

vi.mock("@/lib/ai/agent-router", () => ({
  routeToAgent: vi.fn().mockResolvedValue({
    agent: null,
    intent: "general",
    confidence: 0.9,
    isHandoff: false,
  }),
}))

vi.mock("@/lib/constants", () => ({
  PAGE_SIZE: { DEFAULT: 50, INBOX: 100 },
}))

// ── Imports ──────────────────────────────────────────────

import { POST as POST_AI } from "@/app/api/v1/ai/route"
import { POST as POST_CHAT } from "@/app/api/v1/ai/chat/route"
import { POST as POST_RECOMMEND } from "@/app/api/v1/ai/recommend/route"
import { GET as GET_NEXT_ACTIONS } from "@/app/api/v1/ai/next-actions/route"
import { GET as GET_SESSIONS } from "@/app/api/v1/ai-sessions/route"
import { GET as GET_CONFIGS, POST as POST_CONFIGS } from "@/app/api/v1/ai-configs/route"
import { prisma } from "@/lib/prisma"
import { getSession, getOrgId } from "@/lib/api-auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { generateNextBestActions } from "@/lib/ai/next-best-action"

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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(checkRateLimit).mockReturnValue(true)
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai  (unified Da Vinci endpoint)
// ---------------------------------------------------------------------------
describe("POST /api/v1/ai", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ action: "sentiment", companyId: "c1" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 429 when rate-limited", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(checkRateLimit).mockReturnValue(false)

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ action: "sentiment", companyId: "c1" }),
      }),
    )
    expect(res.status).toBe(429)
  })

  it("returns 400 when action is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ companyId: "c1" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when neither companyId nor leadId is provided", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ action: "sentiment" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 for unknown action", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.company.findFirst).mockResolvedValue({
      id: "c1",
      name: "Acme",
      contacts: [],
      deals: [],
      activities: [],
    } as any)

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ action: "unknown_action", companyId: "c1" }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("Unknown action")
  })

  it("returns 404 when company not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null)

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ action: "sentiment", companyId: "nonexistent" }),
      }),
    )
    expect(res.status).toBe(404)
  })

  it("returns sentiment fallback when ANTHROPIC_API_KEY is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const originalKey = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY

    vi.mocked(prisma.company.findFirst).mockResolvedValue({
      id: "c1",
      name: "Acme",
      contacts: [{ fullName: "John", phone: "+994551234567", email: "john@acme.com" }],
      deals: [],
      activities: [{ type: "call", subject: "Intro", createdAt: new Date() }],
    } as any)

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ action: "sentiment", companyId: "c1" }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.score).toBeDefined()
    expect(body.data.sentiment).toBeDefined()

    process.env.ANTHROPIC_API_KEY = originalKey
  })

  it("returns tasks fallback when ANTHROPIC_API_KEY is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const originalKey = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY

    vi.mocked(prisma.company.findFirst).mockResolvedValue({
      id: "c1",
      name: "Acme",
      industry: "IT",
      website: "acme.com",
      contacts: [{ fullName: "John", phone: "+994551234567", email: "john@acme.com" }],
      deals: [],
      activities: [],
    } as any)

    const res = await POST_AI(
      makeRequest("http://localhost:3000/api/v1/ai", {
        method: "POST",
        body: JSON.stringify({ action: "tasks", companyId: "c1" }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tasks).toHaveLength(4)
    expect(body.data.strategy).toBeDefined()

    process.env.ANTHROPIC_API_KEY = originalKey
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/chat
// ---------------------------------------------------------------------------
describe("POST /api/v1/ai/chat", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await POST_CHAT(
      makeRequest("http://localhost:3000/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when message is empty", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)

    const res = await POST_CHAT(
      makeRequest("http://localhost:3000/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 503 when ANTHROPIC_API_KEY is not set", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const originalKey = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY

    // Need to mock counts for the CRM context gathering
    vi.mocked(prisma.deal.count).mockResolvedValue(5)
    vi.mocked(prisma.company.count).mockResolvedValue(10)
    vi.mocked(prisma.ticket.count).mockResolvedValue(3)
    vi.mocked(prisma.lead.count).mockResolvedValue(8)
    vi.mocked(prisma.deal.findMany).mockResolvedValue([])

    const res = await POST_CHAT(
      makeRequest("http://localhost:3000/api/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: "Hello" }),
      }),
    )
    expect(res.status).toBe(503)

    process.env.ANTHROPIC_API_KEY = originalKey
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/ai/recommend
// ---------------------------------------------------------------------------
describe("POST /api/v1/ai/recommend", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST_RECOMMEND(
      makeRequest("http://localhost:3000/api/v1/ai/recommend", {
        method: "POST",
        body: JSON.stringify({ dealId: "d1" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns empty recommendations when no products exist", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.product.findMany).mockResolvedValue([])

    const res = await POST_RECOMMEND(
      makeRequest("http://localhost:3000/api/v1/ai/recommend", {
        method: "POST",
        body: JSON.stringify({ dealId: "d1" }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.recommendations).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/ai/next-actions
// ---------------------------------------------------------------------------
describe("GET /api/v1/ai/next-actions", () => {
  it("returns 401 when no session", async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const res = await GET_NEXT_ACTIONS(
      makeRequest("http://localhost:3000/api/v1/ai/next-actions"),
    )
    expect(res.status).toBe(401)
  })

  it("returns next best actions on success", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(generateNextBestActions).mockResolvedValue([
      { title: "Follow up with Acme", score: 90, type: "call", entityType: "deal", entityId: "d1" },
    ] as any)

    const res = await GET_NEXT_ACTIONS(
      makeRequest("http://localhost:3000/api/v1/ai/next-actions"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
  })

  it("passes limit query param to generateNextBestActions", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(generateNextBestActions).mockResolvedValue([])

    await GET_NEXT_ACTIONS(
      makeRequest("http://localhost:3000/api/v1/ai/next-actions?limit=5"),
    )

    expect(generateNextBestActions).toHaveBeenCalledWith("org-1", "user-1", 5)
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/ai-sessions
// ---------------------------------------------------------------------------
describe("GET /api/v1/ai-sessions", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_SESSIONS(
      makeRequest("http://localhost:3000/api/v1/ai-sessions"),
    )
    expect(res.status).toBe(401)
  })

  it("returns sessions list", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.aiChatSession.findMany).mockResolvedValue([
      { id: "s1", name: "Session 1", organizationId: "org-1", createdAt: new Date() },
    ] as any)

    const res = await GET_SESSIONS(
      makeRequest("http://localhost:3000/api/v1/ai-sessions"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.sessions).toHaveLength(1)
  })

  it("returns empty sessions on DB error (graceful fallback)", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.aiChatSession.findMany).mockRejectedValue(new Error("DB down"))

    const res = await GET_SESSIONS(
      makeRequest("http://localhost:3000/api/v1/ai-sessions"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.sessions).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// GET/POST /api/v1/ai-configs
// ---------------------------------------------------------------------------
describe("GET /api/v1/ai-configs", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_CONFIGS(
      makeRequest("http://localhost:3000/api/v1/ai-configs"),
    )
    expect(res.status).toBe(401)
  })

  it("returns configs list", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.aiAgentConfig.findMany).mockResolvedValue([
      { id: "cfg1", configName: "Sales Agent", organizationId: "org-1" },
    ] as any)

    const res = await GET_CONFIGS(
      makeRequest("http://localhost:3000/api/v1/ai-configs"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.configs).toHaveLength(1)
  })
})

describe("POST /api/v1/ai-configs", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST_CONFIGS(
      makeRequest("http://localhost:3000/api/v1/ai-configs", {
        method: "POST",
        body: JSON.stringify({ configName: "Test Agent" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when configName is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")

    const res = await POST_CONFIGS(
      makeRequest("http://localhost:3000/api/v1/ai-configs", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("creates an AI agent config and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.aiAgentConfig.create).mockResolvedValue({
      id: "cfg-new",
      configName: "Support Agent",
      organizationId: "org-1",
      agentType: "support",
    } as any)

    const res = await POST_CONFIGS(
      makeRequest("http://localhost:3000/api/v1/ai-configs", {
        method: "POST",
        body: JSON.stringify({
          configName: "Support Agent",
          agentType: "support",
          model: "claude-haiku-4-5-20251001",
        }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.configName).toBe("Support Agent")
  })

  it("normalizes comma-separated toolsEnabled into array", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.aiAgentConfig.create).mockResolvedValue({
      id: "cfg2",
      configName: "Agent",
      toolsEnabled: ["crm_create_task", "crm_log_activity"],
    } as any)

    await POST_CONFIGS(
      makeRequest("http://localhost:3000/api/v1/ai-configs", {
        method: "POST",
        body: JSON.stringify({
          configName: "Agent",
          toolsEnabled: "crm_create_task, crm_log_activity",
        }),
      }),
    )

    const call = vi.mocked(prisma.aiAgentConfig.create).mock.calls[0][0] as any
    expect(call.data.toolsEnabled).toEqual(["crm_create_task", "crm_log_activity"])
  })
})
