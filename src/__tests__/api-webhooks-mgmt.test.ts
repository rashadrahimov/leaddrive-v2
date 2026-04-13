import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// vi.hoisted runs before vi.mock hoisting, so env vars are set before module-level consts
vi.hoisted(() => {
  process.env.FACEBOOK_VERIFY_TOKEN = "fb-test-token"
  process.env.WHATSAPP_VERIFY_TOKEN = "wa-test-token"
})

/* ─── Mocks ──────────────────────────────────────────────────────────── */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhook: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    channelConfig: { findFirst: vi.fn() },
    channelMessage: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    contact: { findFirst: vi.fn(), updateMany: vi.fn() },
    ticket: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn() },
    ticketComment: { create: vi.fn() },
    aiAgentConfig: { findFirst: vi.fn() },
    aiChatSession: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    aiChatMessage: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    aiInteractionLog: { create: vi.fn() },
    kbArticle: { findMany: vi.fn() },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/facebook", () => ({
  upsertSocialConversation: vi.fn().mockResolvedValue({ id: "conv1" }),
}))

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/sanitize", () => ({
  sanitizeLog: vi.fn((s: string) => s),
  sanitizeForPrompt: vi.fn((s: string) => s),
}))

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "AI reply" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    },
  })),
}))

vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue({ toString: () => "mock-secret-hex" }),
    createHmac: actual.createHmac,
    timingSafeEqual: actual.timingSafeEqual,
  }
})

import { GET as GET_WEBHOOKS, POST as POST_WEBHOOK } from "@/app/api/v1/webhooks/manage/route"
import { GET as GET_WEBHOOK_BY_ID, PUT as PUT_WEBHOOK, DELETE as DELETE_WEBHOOK } from "@/app/api/v1/webhooks/manage/[id]/route"
import { GET as GET_FB, POST as POST_FB } from "@/app/api/v1/webhooks/facebook/route"
import { POST as POST_TG, GET as GET_TG } from "@/app/api/v1/webhooks/telegram/route"
import { POST as POST_VK } from "@/app/api/v1/webhooks/vkontakte/route"
import { GET as GET_WA, POST as POST_WA } from "@/app/api/v1/webhooks/whatsapp/route"

import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

/* ─── WEBHOOK MANAGEMENT: GET /manage ─────────────────────────────────── */

describe("GET /api/v1/webhooks/manage", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_WEBHOOKS(makeRequest("/api/v1/webhooks/manage"))
    expect(res.status).toBe(401)
  })

  it("returns list of webhooks", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([{ id: "w1", url: "https://example.com" }] as any)
    const res = await GET_WEBHOOKS(makeRequest("/api/v1/webhooks/manage"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

/* ─── WEBHOOK MANAGEMENT: POST /manage ────────────────────────────────── */

describe("POST /api/v1/webhooks/manage", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await POST_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com", events: ["deal.created"] }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid payload", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    const res = await POST_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage", { method: "POST", body: JSON.stringify({ url: "not-a-url" }) }),
    )
    expect(res.status).toBe(400)
  })

  it("creates webhook with secret", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.create).mockResolvedValue({
      id: "w1",
      url: "https://example.com",
      events: ["deal.created"],
      secret: "mock-secret-hex",
    } as any)
    const res = await POST_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com", events: ["deal.created"] }),
      }),
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.secret).toBeDefined()
  })
})

/* ─── WEBHOOK MANAGEMENT: GET /manage/[id] ────────────────────────────── */

describe("GET /api/v1/webhooks/manage/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_WEBHOOK_BY_ID(makeRequest("/api/v1/webhooks/manage/w1"), makeParams("w1") as any)
    expect(res.status).toBe(401)
  })

  it("returns 404 when webhook not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue(null)
    const res = await GET_WEBHOOK_BY_ID(makeRequest("/api/v1/webhooks/manage/w1"), makeParams("w1") as any)
    expect(res.status).toBe(404)
  })

  it("returns webhook by id", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue({ id: "w1", url: "https://example.com" } as any)
    const res = await GET_WEBHOOK_BY_ID(makeRequest("/api/v1/webhooks/manage/w1"), makeParams("w1") as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe("w1")
  })
})

/* ─── WEBHOOK MANAGEMENT: PUT /manage/[id] ────────────────────────────── */

describe("PUT /api/v1/webhooks/manage/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await PUT_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage/w1", { method: "PUT", body: JSON.stringify({ isActive: false }) }),
      makeParams("w1") as any,
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when webhook not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.updateMany).mockResolvedValue({ count: 0 } as any)
    const res = await PUT_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage/w1", { method: "PUT", body: JSON.stringify({ isActive: false }) }),
      makeParams("w1") as any,
    )
    expect(res.status).toBe(404)
  })

  it("updates webhook", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue({ id: "w1", isActive: false } as any)
    const res = await PUT_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage/w1", { method: "PUT", body: JSON.stringify({ isActive: false }) }),
      makeParams("w1") as any,
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.isActive).toBe(false)
  })
})

/* ─── WEBHOOK MANAGEMENT: DELETE /manage/[id] ─────────────────────────── */

describe("DELETE /api/v1/webhooks/manage/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await DELETE_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage/w1", { method: "DELETE" }),
      makeParams("w1") as any,
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when webhook not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.deleteMany).mockResolvedValue({ count: 0 } as any)
    const res = await DELETE_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage/w1", { method: "DELETE" }),
      makeParams("w1") as any,
    )
    expect(res.status).toBe(404)
  })

  it("deletes webhook", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.webhook.deleteMany).mockResolvedValue({ count: 1 } as any)
    const res = await DELETE_WEBHOOK(
      makeRequest("/api/v1/webhooks/manage/w1", { method: "DELETE" }),
      makeParams("w1") as any,
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.deleted).toBe("w1")
  })
})

/* ─── FACEBOOK WEBHOOK ────────────────────────────────────────────────── */

describe("GET /api/v1/webhooks/facebook", () => {
  it("returns 403 when token mismatches", async () => {
    const res = await GET_FB(makeRequest("/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc"))
    expect(res.status).toBe(403)
  })

  it("returns challenge on valid verification", async () => {
    const res = await GET_FB(
      makeRequest("/api/v1/webhooks/facebook?hub.mode=subscribe&hub.verify_token=fb-test-token&hub.challenge=test123"),
    )
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe("test123")
  })
})

describe("POST /api/v1/webhooks/facebook", () => {
  it("returns ok for non-page object", async () => {
    const res = await POST_FB(
      makeRequest("/api/v1/webhooks/facebook", { method: "POST", body: JSON.stringify({ object: "user" }) }),
    )
    expect(res.status).toBe(200)
  })

  it("processes page message", async () => {
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({ id: "ch1", organizationId: "org1" } as any)
    vi.mocked(prisma.channelMessage.create).mockResolvedValue({ id: "m1" } as any)
    const res = await POST_FB(
      makeRequest("/api/v1/webhooks/facebook", {
        method: "POST",
        body: JSON.stringify({
          object: "page",
          entry: [{
            id: "page1",
            messaging: [{ sender: { id: "user1" }, message: { text: "Hello" } }],
          }],
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(prisma.channelMessage.create).toHaveBeenCalled()
  })
})

/* ─── TELEGRAM WEBHOOK ────────────────────────────────────────────────── */

describe("POST /api/v1/webhooks/telegram", () => {
  it("returns 400 when token param missing", async () => {
    const res = await POST_TG(
      makeRequest("/api/v1/webhooks/telegram", { method: "POST", body: JSON.stringify({ message: { chat: { id: 1 }, from: {}, text: "hi" } }) }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 401 when secret header is invalid", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "correct-secret"
    const res = await POST_TG(
      makeRequest("/api/v1/webhooks/telegram?token=bot123", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "wrong" },
        body: JSON.stringify({ message: { chat: { id: 1 }, from: {}, text: "hi" } }),
      }),
    )
    expect(res.status).toBe(401)
    delete process.env.TELEGRAM_WEBHOOK_SECRET
  })

  it("processes message when config found", async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({ id: "ch1", organizationId: "org1" } as any)
    vi.mocked(prisma.channelMessage.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.channelMessage.create).mockResolvedValue({ id: "m1" } as any)
    const res = await POST_TG(
      makeRequest("/api/v1/webhooks/telegram?token=bot123", {
        method: "POST",
        body: JSON.stringify({
          message: { message_id: 1, chat: { id: 100 }, from: { id: 200, first_name: "John" }, text: "Hello" },
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(prisma.channelMessage.create).toHaveBeenCalled()
  })
})

describe("GET /api/v1/webhooks/telegram", () => {
  it("returns ok status", async () => {
    const res = await GET_TG()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.service).toBe("telegram-webhook")
  })
})

/* ─── VKONTAKTE WEBHOOK ───────────────────────────────────────────────── */

describe("POST /api/v1/webhooks/vkontakte", () => {
  it("returns confirmation code on confirmation event", async () => {
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({
      settings: { confirmationCode: "abc123" },
    } as any)
    const res = await POST_VK(
      makeRequest("/api/v1/webhooks/vkontakte", {
        method: "POST",
        body: JSON.stringify({ type: "confirmation", group_id: "g1" }),
      }),
    )
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe("abc123")
  })

  it("processes message_new event", async () => {
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({ id: "ch1", organizationId: "org1" } as any)
    vi.mocked(prisma.channelMessage.create).mockResolvedValue({ id: "m1" } as any)
    const res = await POST_VK(
      makeRequest("/api/v1/webhooks/vkontakte", {
        method: "POST",
        body: JSON.stringify({
          type: "message_new",
          group_id: "g1",
          object: { message: { from_id: 123, text: "Hello" } },
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(prisma.channelMessage.create).toHaveBeenCalled()
  })
})

/* ─── WHATSAPP WEBHOOK ────────────────────────────────────────────────── */

describe("GET /api/v1/webhooks/whatsapp", () => {
  it("returns 403 when token mismatches", async () => {
    const res = await GET_WA(makeRequest("/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc"))
    expect(res.status).toBe(403)
  })

  it("returns challenge on valid verification", async () => {
    const res = await GET_WA(makeRequest("/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wa-test-token&hub.challenge=challenge123"))
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe("challenge123")
  })
})

describe("POST /api/v1/webhooks/whatsapp", () => {
  it("returns 401 when signature is invalid and app secret is set", async () => {
    process.env.WHATSAPP_APP_SECRET = "test-secret"
    const res = await POST_WA(
      makeRequest("/api/v1/webhooks/whatsapp", {
        method: "POST",
        body: JSON.stringify({ entry: [] }),
        headers: { "x-hub-signature-256": "sha256=invalid" },
      }),
    )
    expect(res.status).toBe(401)
    delete process.env.WHATSAPP_APP_SECRET
  })

  it("returns ok when no messages in payload", async () => {
    delete process.env.WHATSAPP_APP_SECRET
    const res = await POST_WA(
      makeRequest("/api/v1/webhooks/whatsapp", {
        method: "POST",
        body: JSON.stringify({ entry: [{ changes: [{ value: {} }] }] }),
      }),
    )
    expect(res.status).toBe(200)
  })
})
