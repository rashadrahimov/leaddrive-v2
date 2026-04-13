import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    channelMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    contact: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    socialConversation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    channelConfig: {
      findFirst: vi.fn(),
    },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getSession: vi.fn(),
  getOrgId: vi.fn(),
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/constants", () => ({
  PAGE_SIZE: { DEFAULT: 50, INBOX: 100 },
}))

vi.mock("@/lib/chat-store", () => ({
  getSession: vi.fn(),
  createSession: vi.fn(),
  addVisitorMessage: vi.fn(),
  setReplyMapping: vi.fn(),
}))

// ── Imports ──────────────────────────────────────────────

import {
  GET as GET_INBOX,
  POST as POST_INBOX,
  PATCH as PATCH_INBOX,
  DELETE as DELETE_INBOX,
} from "@/app/api/v1/inbox/route"
import { GET as GET_CONVERSATIONS } from "@/app/api/v1/inbox/conversations/route"
import {
  GET as GET_CONVERSATION_BY_ID,
  PATCH as PATCH_CONVERSATION,
} from "@/app/api/v1/inbox/conversations/[id]/route"
import { POST as POST_CONVERSATION_MSG } from "@/app/api/v1/inbox/conversations/[id]/messages/route"
import { GET as GET_CHAT_MESSAGES } from "@/app/api/chat/messages/route"
import { POST as POST_CHAT_SEND } from "@/app/api/chat/send/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"
import { getSession as getChatSession, addVisitorMessage, setReplyMapping, createSession } from "@/lib/chat-store"

const ORG_ID = "org-1"

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
// GET /api/v1/inbox
// ---------------------------------------------------------------------------
describe("GET /api/v1/inbox", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_INBOX(makeRequest("http://localhost:3000/api/v1/inbox"))
    expect(res.status).toBe(401)
  })

  it("returns conversations grouped from messages", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)
    vi.mocked(prisma.channelMessage.findMany).mockResolvedValue([
      {
        id: "m1",
        organizationId: ORG_ID,
        direction: "inbound",
        channelType: "email",
        from: "client@test.com",
        to: "crm@test.com",
        body: "Hello there",
        status: "new",
        contactId: null,
        createdAt: new Date("2025-01-01"),
        metadata: {},
      },
    ] as any)
    vi.mocked(prisma.contact.findMany).mockResolvedValue([])

    const res = await GET_INBOX(makeRequest("http://localhost:3000/api/v1/inbox"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.conversations.length).toBeGreaterThanOrEqual(1)
    expect(body.data.stats.totalMessages).toBe(1)
    expect(body.data.stats.inbound).toBe(1)
  })

  it("returns empty data on DB error (graceful fallback)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)
    vi.mocked(prisma.channelMessage.findMany).mockRejectedValue(new Error("DB down"))

    const res = await GET_INBOX(makeRequest("http://localhost:3000/api/v1/inbox"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.conversations).toEqual([])
    expect(body.data.stats.totalMessages).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/inbox (send message)
// ---------------------------------------------------------------------------
describe("POST /api/v1/inbox", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await POST_INBOX(
      makeRequest("http://localhost:3000/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify({ to: "a@b.com", body: "Hi", channel: "email" }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when validation fails (missing body)", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)

    const res = await POST_INBOX(
      makeRequest("http://localhost:3000/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify({ to: "a@b.com" }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("sends email and saves message to DB", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)
    vi.mocked(sendEmail).mockResolvedValue({ success: true } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.channelMessage.create).mockResolvedValue({
      id: "msg-new",
      direction: "outbound",
      channelType: "email",
      to: "client@test.com",
      body: "Hello",
      status: "delivered",
    } as any)

    const res = await POST_INBOX(
      makeRequest("http://localhost:3000/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify({ to: "client@test.com", body: "Hello", channel: "email" }),
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(sendEmail).toHaveBeenCalled()
  })

  it("returns 400 for email channel with invalid address", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)

    const res = await POST_INBOX(
      makeRequest("http://localhost:3000/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify({ to: "not-an-email", body: "Hi", channel: "email" }),
      }),
    )
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/inbox (mark as read)
// ---------------------------------------------------------------------------
describe("PATCH /api/v1/inbox", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await PATCH_INBOX(
      makeRequest("http://localhost:3000/api/v1/inbox", {
        method: "PATCH",
        body: JSON.stringify({ messageIds: ["m1"] }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when messageIds is missing or empty", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)

    const res = await PATCH_INBOX(
      makeRequest("http://localhost:3000/api/v1/inbox", {
        method: "PATCH",
        body: JSON.stringify({ messageIds: [] }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it("marks messages as read", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)
    vi.mocked(prisma.channelMessage.updateMany).mockResolvedValue({ count: 2 } as any)

    const res = await PATCH_INBOX(
      makeRequest("http://localhost:3000/api/v1/inbox", {
        method: "PATCH",
        body: JSON.stringify({ messageIds: ["m1", "m2"] }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(prisma.channelMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "read" },
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/inbox/conversations
// ---------------------------------------------------------------------------
describe("GET /api/v1/inbox/conversations", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_CONVERSATIONS(
      makeRequest("http://localhost:3000/api/v1/inbox/conversations"),
    )
    expect(res.status).toBe(401)
  })

  it("returns paginated social conversations", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)
    vi.mocked(prisma.socialConversation.findMany).mockResolvedValue([
      { id: "conv1", platform: "whatsapp", status: "open", organizationId: ORG_ID },
    ] as any)
    vi.mocked(prisma.socialConversation.count).mockResolvedValue(1)

    const res = await GET_CONVERSATIONS(
      makeRequest("http://localhost:3000/api/v1/inbox/conversations"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.conversations).toHaveLength(1)
    expect(body.data.total).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/inbox/conversations/:id
// ---------------------------------------------------------------------------
describe("GET /api/v1/inbox/conversations/:id", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET_CONVERSATION_BY_ID(
      makeRequest("http://localhost:3000/api/v1/inbox/conversations/conv1"),
      makeParams("conv1"),
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when conversation not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)
    vi.mocked(prisma.socialConversation.findFirst).mockResolvedValue(null)

    const res = await GET_CONVERSATION_BY_ID(
      makeRequest("http://localhost:3000/api/v1/inbox/conversations/nonexistent"),
      makeParams("nonexistent"),
    )
    expect(res.status).toBe(404)
  })

  it("returns conversation with messages and marks as read", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG_ID)
    vi.mocked(prisma.socialConversation.findFirst).mockResolvedValue({
      id: "conv1",
      platform: "telegram",
      organizationId: ORG_ID,
    } as any)
    vi.mocked(prisma.channelMessage.findMany).mockResolvedValue([
      { id: "m1", body: "Hello", direction: "inbound" },
    ] as any)
    vi.mocked(prisma.socialConversation.updateMany).mockResolvedValue({ count: 1 } as any)

    const res = await GET_CONVERSATION_BY_ID(
      makeRequest("http://localhost:3000/api/v1/inbox/conversations/conv1"),
      makeParams("conv1"),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.messages).toHaveLength(1)
    // Should mark unread count as 0
    expect(prisma.socialConversation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { unreadCount: 0 },
      }),
    )
  })
})

// ---------------------------------------------------------------------------
// GET /api/chat/messages (marketing chat widget)
// ---------------------------------------------------------------------------
describe("GET /api/chat/messages", () => {
  it("returns 400 when sessionId is missing", async () => {
    const res = await GET_CHAT_MESSAGES(
      makeRequest("http://localhost:3000/api/chat/messages") as any,
    )
    expect(res.status).toBe(400)
  })

  it("returns empty messages when session not found", async () => {
    vi.mocked(getChatSession).mockReturnValue(undefined)

    const res = await GET_CHAT_MESSAGES(
      makeRequest("http://localhost:3000/api/chat/messages?sessionId=abc123") as any,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toEqual([])
  })

  it("returns messages after the given timestamp", async () => {
    const now = Date.now()
    vi.mocked(getChatSession).mockReturnValue({
      id: "abc123",
      messages: [
        { id: "m1", from: "visitor", text: "Old", timestamp: now - 5000 },
        { id: "m2", from: "operator", text: "New", timestamp: now + 1000 },
      ],
      createdAt: now - 10000,
      lastActivity: now,
    })

    const res = await GET_CHAT_MESSAGES(
      makeRequest(`http://localhost:3000/api/chat/messages?sessionId=abc123&after=${now}`) as any,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].text).toBe("New")
  })
})

// ---------------------------------------------------------------------------
// POST /api/chat/send (marketing chat widget)
// ---------------------------------------------------------------------------
describe("POST /api/chat/send", () => {
  it("returns 400 when sessionId or text is missing", async () => {
    const res = await POST_CHAT_SEND(
      makeRequest("http://localhost:3000/api/chat/send", {
        method: "POST",
        body: JSON.stringify({ sessionId: "" }),
      }) as any,
    )
    expect(res.status).toBe(400)
  })

  it("sends message to Telegram and stores in chat-store", async () => {
    const mockMsg = { id: "v_123", from: "visitor", text: "Hello", timestamp: Date.now() }
    vi.mocked(addVisitorMessage).mockReturnValue(mockMsg)
    vi.mocked(getChatSession).mockReturnValue(undefined)
    vi.mocked(createSession).mockReturnValue({ id: "sess1", messages: [], createdAt: Date.now(), lastActivity: Date.now() } as any)

    // Mock global fetch for Telegram API
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: { message_id: 42 } }),
    })

    const res = await POST_CHAT_SEND(
      makeRequest("http://localhost:3000/api/chat/send", {
        method: "POST",
        body: JSON.stringify({ sessionId: "sess1", text: "Hello", visitorName: "John" }),
      }) as any,
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(addVisitorMessage).toHaveBeenCalledWith("sess1", "Hello")
    expect(setReplyMapping).toHaveBeenCalledWith(42, "sess1")

    globalThis.fetch = originalFetch
  })
})
