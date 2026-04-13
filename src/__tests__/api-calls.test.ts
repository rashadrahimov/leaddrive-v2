import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/* ─── Mocks ──────────────────────────────────────────────────────────── */

const mockInitiateCall = vi.fn()
const mockEndCall = vi.fn()
const mockTestConnection = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    channelConfig: { findFirst: vi.fn() },
    callLog: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    contact: { findFirst: vi.fn() },
    activity: { create: vi.fn() },
    channelMessage: { updateMany: vi.fn() },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/voip", () => ({
  getVoipProvider: vi.fn(() => ({
    initiateCall: mockInitiateCall,
    endCall: mockEndCall,
    testConnection: mockTestConnection,
  })),
}))

vi.mock("@/lib/contact-events", () => ({
  trackContactEvent: vi.fn().mockResolvedValue(undefined),
}))

import { POST as POST_CALL, GET as GET_CALLS } from "@/app/api/v1/calls/route"
import { PATCH as PATCH_DISPOSITION } from "@/app/api/v1/calls/[id]/disposition/route"
import { POST as POST_END } from "@/app/api/v1/calls/[id]/end/route"
import { PATCH as PATCH_NOTES } from "@/app/api/v1/calls/[id]/notes/route"
import { GET as GET_ACTIVE } from "@/app/api/v1/calls/active/route"
import { POST as POST_TEST } from "@/app/api/v1/calls/test/route"
import { POST as POST_TWIML } from "@/app/api/v1/calls/twiml/route"
import { POST as POST_WEBHOOK } from "@/app/api/v1/calls/webhook/route"
import { POST as POST_THREECX, GET as GET_THREECX } from "@/app/api/v1/calls/webhook/threecx/route"

import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

/* ─── POST /api/v1/calls (initiate call) ─────────────────────────────── */

describe("POST /api/v1/calls", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await POST_CALL(
      makeRequest("/api/v1/calls", { method: "POST", body: JSON.stringify({ toNumber: "+1234" }) }),
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when toNumber missing", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: "org1", userId: "u1" } as any)
    const res = await POST_CALL(
      makeRequest("/api/v1/calls", { method: "POST", body: JSON.stringify({}) }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 when VoIP not configured", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: "org1", userId: "u1" } as any)
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue(null)
    const res = await POST_CALL(
      makeRequest("/api/v1/calls", { method: "POST", body: JSON.stringify({ toNumber: "+1234" }) }),
    )
    expect(res.status).toBe(400)
  })

  it("initiates call and returns callLogId", async () => {
    vi.mocked(getSession).mockResolvedValue({ orgId: "org1", userId: "u1" } as any)
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({
      settings: { provider: "twilio", twilioNumber: "+100" },
    } as any)
    vi.mocked(prisma.callLog.create).mockResolvedValue({ id: "cl1" } as any)
    mockInitiateCall.mockResolvedValue({ success: true, callSid: "sid123" })
    vi.mocked(prisma.callLog.update).mockResolvedValue({} as any)

    const res = await POST_CALL(
      makeRequest("/api/v1/calls", { method: "POST", body: JSON.stringify({ toNumber: "+1234" }) }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.callLogId).toBe("cl1")
    expect(json.callSid).toBe("sid123")
  })
})

/* ─── GET /api/v1/calls (history) ─────────────────────────────────────── */

describe("GET /api/v1/calls", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_CALLS(makeRequest("/api/v1/calls"))
    expect(res.status).toBe(401)
  })

  it("returns paginated call history", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.callLog.findMany).mockResolvedValue([{ id: "cl1" }] as any)
    vi.mocked(prisma.callLog.count).mockResolvedValue(1)
    const res = await GET_CALLS(makeRequest("/api/v1/calls?page=1&limit=10"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
  })
})

/* ─── PATCH /api/v1/calls/[id]/disposition ────────────────────────────── */

describe("PATCH /api/v1/calls/[id]/disposition", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await PATCH_DISPOSITION(
      makeRequest("/api/v1/calls/cl1/disposition", { method: "PATCH", body: JSON.stringify({ disposition: "interested" }) }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid disposition", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    const res = await PATCH_DISPOSITION(
      makeRequest("/api/v1/calls/cl1/disposition", { method: "PATCH", body: JSON.stringify({ disposition: "invalid" }) }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(400)
  })

  it("updates disposition successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.callLog.updateMany).mockResolvedValue({ count: 1 } as any)
    const res = await PATCH_DISPOSITION(
      makeRequest("/api/v1/calls/cl1/disposition", { method: "PATCH", body: JSON.stringify({ disposition: "callback" }) }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(200)
  })
})

/* ─── POST /api/v1/calls/[id]/end ─────────────────────────────────────── */

describe("POST /api/v1/calls/[id]/end", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await POST_END(
      makeRequest("/api/v1/calls/cl1/end", { method: "POST" }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when call not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.callLog.findFirst).mockResolvedValue(null)
    const res = await POST_END(
      makeRequest("/api/v1/calls/cl1/end", { method: "POST" }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(404)
  })

  it("ends call via provider", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.callLog.findFirst).mockResolvedValue({ id: "cl1", callSid: "sid1" } as any)
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({
      settings: { provider: "twilio" },
    } as any)
    mockEndCall.mockResolvedValue({ success: true })
    vi.mocked(prisma.callLog.update).mockResolvedValue({} as any)
    const res = await POST_END(
      makeRequest("/api/v1/calls/cl1/end", { method: "POST" }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(200)
  })
})

/* ─── PATCH /api/v1/calls/[id]/notes ──────────────────────────────────── */

describe("PATCH /api/v1/calls/[id]/notes", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await PATCH_NOTES(
      makeRequest("/api/v1/calls/cl1/notes", { method: "PATCH", body: JSON.stringify({ notes: "test" }) }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when notes is not a string", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    const res = await PATCH_NOTES(
      makeRequest("/api/v1/calls/cl1/notes", { method: "PATCH", body: JSON.stringify({ notes: 123 }) }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when call not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.callLog.updateMany).mockResolvedValue({ count: 0 } as any)
    const res = await PATCH_NOTES(
      makeRequest("/api/v1/calls/cl1/notes", { method: "PATCH", body: JSON.stringify({ notes: "test" }) }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(404)
  })

  it("saves notes successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.callLog.updateMany).mockResolvedValue({ count: 1 } as any)
    const res = await PATCH_NOTES(
      makeRequest("/api/v1/calls/cl1/notes", { method: "PATCH", body: JSON.stringify({ notes: "Follow up needed" }) }),
      makeParams("cl1") as any,
    )
    expect(res.status).toBe(200)
  })
})

/* ─── GET /api/v1/calls/active ────────────────────────────────────────── */

describe("GET /api/v1/calls/active", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GET_ACTIVE(makeRequest("/api/v1/calls/active"))
    expect(res.status).toBe(401)
  })

  it("returns active calls", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.callLog.findMany).mockResolvedValue([{ id: "cl1", status: "ringing" }] as any)
    const res = await GET_ACTIVE(makeRequest("/api/v1/calls/active"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

/* ─── POST /api/v1/calls/test ─────────────────────────────────────────── */

describe("POST /api/v1/calls/test", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await POST_TEST(makeRequest("/api/v1/calls/test", { method: "POST" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when VoIP not configured", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue(null)
    const res = await POST_TEST(makeRequest("/api/v1/calls/test", { method: "POST" }))
    expect(res.status).toBe(400)
  })

  it("tests connection and returns result", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org1")
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({
      settings: { provider: "twilio" },
    } as any)
    mockTestConnection.mockResolvedValue({ success: true, message: "Connected" })
    const res = await POST_TEST(makeRequest("/api/v1/calls/test", { method: "POST" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.provider).toBe("twilio")
  })
})

/* ─── POST /api/v1/calls/twiml ────────────────────────────────────────── */

describe("POST /api/v1/calls/twiml", () => {
  it("returns TwiML with error message when no To number", async () => {
    // FormData parsing will fail with empty body, falls back to searchParams
    const res = await POST_TWIML(makeRequest("/api/v1/calls/twiml", { method: "POST" }))
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain("<Say>")
    expect(text).toContain("could not determine")
  })
})

/* ─── POST /api/v1/calls/webhook (Twilio status) ─────────────────────── */

describe("POST /api/v1/calls/webhook", () => {
  it("returns 400 when CallSid missing", async () => {
    const formBody = new URLSearchParams({ CallStatus: "completed" })
    const res = await POST_WEBHOOK(
      makeRequest("/api/v1/calls/webhook", {
        method: "POST",
        body: formBody.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    )
    expect(res.status).toBe(400)
  })

  it("returns XML response when call not found", async () => {
    vi.mocked(prisma.callLog.findUnique).mockResolvedValue(null)
    const formBody = new URLSearchParams({ CallSid: "sid1", CallStatus: "completed" })
    const res = await POST_WEBHOOK(
      makeRequest("/api/v1/calls/webhook", {
        method: "POST",
        body: formBody.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    )
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain("<Response/>")
  })
})

/* ─── 3CX Webhook ─────────────────────────────────────────────────────── */

describe("POST /api/v1/calls/webhook/threecx", () => {
  it("returns 400 when orgId missing", async () => {
    const res = await POST_THREECX(
      makeRequest("/api/v1/calls/webhook/threecx", { method: "POST", body: JSON.stringify({ event: "call.ringing" }) }),
    )
    expect(res.status).toBe(400)
  })

  it("returns 401 when secret is wrong", async () => {
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({
      settings: { webhookSecret: "correct-secret" },
    } as any)
    const res = await POST_THREECX(
      makeRequest("/api/v1/calls/webhook/threecx?orgId=org1&secret=wrong", {
        method: "POST",
        body: JSON.stringify({ event: "call.ringing", call: { callId: "c1", callerNumber: "+1", calleeNumber: "+2" } }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it("creates call log on ringing event", async () => {
    vi.mocked(prisma.channelConfig.findFirst).mockResolvedValue({ settings: {} } as any)
    vi.mocked(prisma.contact.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.callLog.create).mockResolvedValue({ id: "cl1" } as any)
    const res = await POST_THREECX(
      makeRequest("/api/v1/calls/webhook/threecx?orgId=org1&secret=s", {
        method: "POST",
        body: JSON.stringify({
          event: "call.ringing",
          call: { callId: "c1", callerNumber: "+1234", calleeNumber: "+5678", direction: "inbound" },
        }),
      }),
    )
    expect(res.status).toBe(200)
    expect(prisma.callLog.create).toHaveBeenCalled()
  })
})

describe("GET /api/v1/calls/webhook/threecx", () => {
  it("returns ok status", async () => {
    const res = await GET_THREECX()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.service).toBe("3cx-webhook")
  })
})
