import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/**
 * Tests for mass SMS campaigns (TT §7 "Kütləvi SMS").
 *
 * Verifies:
 *   1. Campaigns with type="sms" route through our sendSms() abstraction
 *      (not the email sender) and land on the currently-configured SMS
 *      provider (Twilio, Vonage, or ATL).
 *   2. Contacts without phones are skipped for SMS campaigns.
 *   3. The endpoint returns 422 when no SMS provider is configured.
 *   4. recipientMode="manual" honours campaign.recipientIds.
 */

const state: {
  campaign: any
  contacts: any[]
  smsCalls: any[]
  emailCalls: any[]
} = { campaign: null, contacts: [], smsCalls: [], emailCalls: [] }

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(async () => "org_1"),
  getSession: vi.fn(async () => ({ userId: "u1", orgId: "org_1" })),
}))

const attributionUpdates: Array<{ ids: string[]; campaignId: string }> = []

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: {
      findFirst: vi.fn(async () => state.campaign),
      update: vi.fn(async () => state.campaign),
    },
    contact: {
      findMany: vi.fn(async ({ where }: any) => {
        let rows = [...state.contacts]
        if (where?.phone?.not === null) rows = rows.filter((c) => c.phone)
        if (where?.email?.not === null) rows = rows.filter((c) => c.email)
        if (where?.id?.in) rows = rows.filter((c) => where.id.in.includes(c.id))
        return rows
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        attributionUpdates.push({
          ids: where?.id?.in || [],
          campaignId: data?.lastSmsCampaignId || "",
        })
        return { count: (where?.id?.in || []).length }
      }),
    },
    lead: { findMany: vi.fn(async () => []) },
    contactSegment: { findFirst: vi.fn(async () => null) },
    campaignVariant: { findMany: vi.fn(async () => []) },
    emailTemplate: { findFirst: vi.fn(async () => null) },
  },
}))

vi.mock("@/lib/sms", () => ({
  sendSms: vi.fn(async (opts: any) => {
    state.smsCalls.push(opts)
    return { success: true, messageId: `SM_${state.smsCalls.length}` }
  }),
  isSmsConfigured: vi.fn(async () => true),
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async (opts: any) => {
    state.emailCalls.push(opts)
    return { success: true }
  }),
  renderTemplate: vi.fn((tpl: string) => tpl),
}))

vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn(async () => {}) }))
vi.mock("@/lib/contact-events", () => ({ trackContactEvent: vi.fn(async () => {}) }))

import { POST } from "@/app/api/v1/campaigns/[id]/send/route"
import { isSmsConfigured, sendSms } from "@/lib/sms"

function makeReq(): NextRequest {
  return new NextRequest("https://example.com/api/v1/campaigns/c1/send", { method: "POST" })
}

beforeEach(() => {
  state.campaign = null
  state.contacts = []
  state.smsCalls = []
  state.emailCalls = []
  attributionUpdates.length = 0
  vi.clearAllMocks()
  ;(isSmsConfigured as any).mockResolvedValue(true)
})

describe("POST /api/v1/campaigns/[id]/send — SMS branch (TT §7)", () => {
  it("uses sendSms (not sendEmail) when campaign.type is 'sms'", async () => {
    state.campaign = {
      id: "c1",
      organizationId: "org_1",
      type: "sms",
      name: "Flash sale",
      subject: "Flash sale! 30% off today only",
      recipientMode: "all",
    }
    state.contacts = [
      { id: "k1", phone: "+994501234567", email: "a@b.com", fullName: "Ali", source: null },
      { id: "k2", phone: "+994507654321", email: null, fullName: "Bob", source: null },
    ]

    const res = await POST(makeReq(), { params: Promise.resolve({ id: "c1" }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.channel).toBe("sms")
    expect(body.data.sent).toBe(2)
    expect(state.smsCalls).toHaveLength(2)
    expect(state.emailCalls).toHaveLength(0)

    // Each SMS received the campaign subject as the message body
    for (const call of state.smsCalls) {
      expect(call.message).toBe("Flash sale! 30% off today only")
      expect(call.organizationId).toBe("org_1")
    }
  })

  it("skips contacts without phone numbers", async () => {
    state.campaign = {
      id: "c1",
      organizationId: "org_1",
      type: "sms",
      name: "Promo",
      subject: "Hi",
      recipientMode: "all",
    }
    state.contacts = [
      { id: "k1", phone: "+994501234567", fullName: "Ali" },
      { id: "k2", phone: null, fullName: "Bob" }, // should be filtered out
    ]

    const res = await POST(makeReq(), { params: Promise.resolve({ id: "c1" }) })
    const body = await res.json()

    expect(state.smsCalls).toHaveLength(1)
    expect(body.data.sent).toBe(1)
    expect(body.data.total).toBe(1)
  })

  it("returns 422 when no SMS provider configured", async () => {
    ;(isSmsConfigured as any).mockResolvedValue(false)
    state.campaign = {
      id: "c1",
      organizationId: "org_1",
      type: "sms",
      name: "x",
      subject: "y",
      recipientMode: "all",
    }
    state.contacts = [{ id: "k1", phone: "+994501234567", fullName: "Ali" }]

    const res = await POST(makeReq(), { params: Promise.resolve({ id: "c1" }) })
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error).toMatch(/not configured/i)
    expect(state.smsCalls).toHaveLength(0)
  })

  it("honours recipientMode=manual with explicit recipientIds", async () => {
    state.campaign = {
      id: "c1",
      organizationId: "org_1",
      type: "sms",
      name: "VIP blast",
      subject: "hi",
      recipientMode: "manual",
      recipientIds: ["k2"],
    }
    state.contacts = [
      { id: "k1", phone: "+994501234567", fullName: "Ali" },
      { id: "k2", phone: "+994509999999", fullName: "Zoe" },
    ]

    await POST(makeReq(), { params: Promise.resolve({ id: "c1" }) })

    expect(state.smsCalls).toHaveLength(1)
    expect(state.smsCalls[0].to).toBe("+994509999999")
  })

  it("stamps lastSmsCampaignId on every contact that successfully received the SMS (TT §3.3 attribution)", async () => {
    state.campaign = {
      id: "c42",
      organizationId: "org_1",
      type: "sms",
      name: "Attribution test",
      subject: "hi",
      recipientMode: "all",
    }
    state.contacts = [
      { id: "k1", phone: "+994501234567", fullName: "Ali" },
      { id: "k2", phone: "+994507654321", fullName: "Bob" },
    ]

    await POST(makeReq(), { params: Promise.resolve({ id: "c42" }) })

    expect(attributionUpdates).toHaveLength(1)
    expect(attributionUpdates[0].campaignId).toBe("c42")
    expect(attributionUpdates[0].ids.sort()).toEqual(["k1", "k2"])
  })

  it("does NOT stamp attribution when no SMS delivered successfully", async () => {
    ;(sendSms as any).mockResolvedValue({ success: false, error: "Carrier rejected" })
    state.campaign = {
      id: "c99",
      organizationId: "org_1",
      type: "sms",
      name: "all fail",
      subject: "hi",
      recipientMode: "all",
    }
    state.contacts = [{ id: "k1", phone: "+994501234567", fullName: "Ali" }]

    await POST(makeReq(), { params: Promise.resolve({ id: "c99" }) })

    expect(attributionUpdates).toHaveLength(0)
  })

  it("does NOT go through SMS branch when type is 'email' (or missing)", async () => {
    state.campaign = {
      id: "c1",
      organizationId: "org_1",
      type: "email",
      name: "Newsletter",
      subject: "Monthly update",
      recipientMode: "all",
    }
    state.contacts = [{ id: "k1", phone: "+994501234567", email: "a@b.com", fullName: "Ali" }]

    await POST(makeReq(), { params: Promise.resolve({ id: "c1" }) })

    expect(state.smsCalls).toHaveLength(0) // SMS branch skipped
    expect(sendSms).not.toHaveBeenCalled()
  })
})
