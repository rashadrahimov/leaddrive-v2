import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/**
 * Inbox SMS path — verifies POST /api/v1/inbox with channel="sms" routes
 * through the sendSms() abstraction (NOT the old hardcoded Twilio fetch),
 * and that ChannelMessage is logged with the right delivery status.
 *
 * Before this refactor, the inbox called api.twilio.com directly and would
 * fail for any org configured with ATL or Vonage — that's the regression
 * this test locks in.
 */

const state: {
  smsCalls: any[]
  messagesCreated: any[]
  sendSmsResult: { success: boolean; messageId?: string; error?: string }
} = { smsCalls: [], messagesCreated: [], sendSmsResult: { success: true, messageId: "sm_1" } }

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(async () => "org_1"),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    contact: {
      findFirst: vi.fn(async () => null),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    channelConfig: {
      findFirst: vi.fn(async () => null),
    },
    channelMessage: {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `msg_${state.messagesCreated.length + 1}`, ...data }
        state.messagesCreated.push(row)
        return row
      }),
      findFirst: vi.fn(async () => null),
    },
  },
}))

vi.mock("@/lib/sms", () => ({
  sendSms: vi.fn(async (opts: any) => {
    state.smsCalls.push(opts)
    return state.sendSmsResult
  }),
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
}))

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn(async () => ({ success: true, messageId: "wa_1" })),
}))

import { POST } from "@/app/api/v1/inbox/route"
import { sendSms } from "@/lib/sms"

function makeReq(body: any): NextRequest {
  return new NextRequest("https://example.com/api/v1/inbox", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.smsCalls = []
  state.messagesCreated = []
  state.sendSmsResult = { success: true, messageId: "sm_1" }
  vi.clearAllMocks()
})

describe("POST /api/v1/inbox — channel: 'sms'", () => {
  it("delegates to sendSms() with { to, message, organizationId } — no direct Twilio call", async () => {
    const res = await POST(makeReq({ to: "+994501234567", body: "Hello from LeadDrive", channel: "sms" }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.success).toBe(true)
    expect(sendSms).toHaveBeenCalledTimes(1)
    expect(state.smsCalls[0]).toEqual({
      to: "+994501234567",
      message: "Hello from LeadDrive",
      organizationId: "org_1",
    })
  })

  it("logs ChannelMessage with status=delivered on success", async () => {
    await POST(makeReq({ to: "+994501234567", body: "ok", channel: "sms" }))

    expect(state.messagesCreated).toHaveLength(1)
    const msg = state.messagesCreated[0]
    expect(msg.channelType).toBe("sms")
    expect(msg.direction).toBe("outbound")
    expect(msg.status).toBe("delivered")
    expect(msg.to).toBe("+994501234567")
    expect(msg.body).toBe("ok")
  })

  it("logs ChannelMessage with status=failed and returns 500 on provider error", async () => {
    state.sendSmsResult = { success: false, error: "ATL 105: invalid credentials" }

    const res = await POST(makeReq({ to: "+994501234567", body: "ok", channel: "sms" }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.success).toBe(false)
    expect(json.error).toMatch(/ATL 105/)
    expect(state.messagesCreated).toHaveLength(1)
    expect(state.messagesCreated[0].status).toBe("failed")
    expect(state.messagesCreated[0].metadata).toEqual({ error: "ATL 105: invalid credentials" })
  })

  it("surfaces 'SMS provider not configured' through the abstraction (not a Twilio-specific 400)", async () => {
    state.sendSmsResult = { success: false, error: "SMS provider not configured" }

    const res = await POST(makeReq({ to: "+994501234567", body: "ok", channel: "sms" }))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe("SMS provider not configured")
    // Still logs the attempt
    expect(state.messagesCreated).toHaveLength(1)
    expect(state.messagesCreated[0].status).toBe("failed")
  })
})
