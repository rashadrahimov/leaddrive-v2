import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Journey engine SMS step — verifies it routes through sendSms() with
 * { to: recipientPhone, message, organizationId } instead of calling
 * api.twilio.com directly. Covers the missing-phone short-circuit and
 * provider-error reporting.
 */

const state: {
  smsCalls: any[]
  sendSmsResult: { success: boolean; messageId?: string; error?: string }
  enrollment: any
  contact: any
  journey: any
} = {
  smsCalls: [],
  sendSmsResult: { success: true, messageId: "sm_1" },
  enrollment: null,
  contact: null,
  journey: null,
}

vi.mock("@/lib/sms", () => ({
  sendSms: vi.fn(async (opts: any) => {
    state.smsCalls.push(opts)
    return state.sendSmsResult
  }),
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    journeyEnrollment: {
      findFirst: vi.fn(async () => state.enrollment),
      update: vi.fn(async () => state.enrollment),
    },
    journey: {
      findFirst: vi.fn(async () => state.journey),
      update: vi.fn(async () => state.journey),
    },
    journeyStep: {
      update: vi.fn(async () => ({})),
    },
    contact: {
      findUnique: vi.fn(async () => state.contact),
      update: vi.fn(async () => state.contact),
    },
    lead: {
      findUnique: vi.fn(async () => null),
    },
    invoice: {
      findUnique: vi.fn(async () => null),
    },
    task: {
      create: vi.fn(async () => ({ id: "t_1" })),
    },
    channelConfig: {
      findFirst: vi.fn(async () => null),
    },
  },
}))

import { processEnrollmentStep } from "@/lib/journey-engine"
import { sendSms } from "@/lib/sms"

function setupBase({ phone, message = "Hi" }: { phone: string | null; message?: string }) {
  const step = {
    id: "step_1",
    journeyId: "j1",
    stepType: "sms",
    stepOrder: 0,
    config: { message },
    yesNextStepId: null,
    noNextStepId: null,
  }
  state.enrollment = {
    id: "enr_1",
    organizationId: "org_1",
    status: "active",
    currentStepId: "step_1",
    journeyId: "j1",
    leadId: null,
    contactId: "c1",
    invoiceId: null,
  }
  state.contact = { id: "c1", phone, fullName: "Ali", email: null }
  state.journey = {
    id: "j1",
    organizationId: "org_1",
    isActive: true,
    steps: [step],
  }
}

beforeEach(() => {
  state.smsCalls = []
  state.sendSmsResult = { success: true, messageId: "sm_1" }
  vi.clearAllMocks()
})

describe("journey-engine — SMS step", () => {
  it("calls sendSms with recipient phone, the step message, and orgId", async () => {
    setupBase({ phone: "+994501234567", message: "Hi, we have news" })

    const result = await processEnrollmentStep("enr_1", "org_1")

    expect(sendSms).toHaveBeenCalledTimes(1)
    expect(state.smsCalls[0]).toEqual({
      to: "+994501234567",
      message: "Hi, we have news",
      organizationId: "org_1",
    })
    expect(result.status).toBe("completed")
    expect(result.message).toContain("SMS sent to +994501234567")
  })

  it("skips the send when contact has no phone — still marks step completed", async () => {
    setupBase({ phone: null, message: "Hi" })

    const result = await processEnrollmentStep("enr_1", "org_1")

    expect(sendSms).not.toHaveBeenCalled()
    expect(result.status).toBe("completed")
    expect(result.message).toMatch(/SMS skipped/)
  })

  it("reports provider failure in the step message (does not throw)", async () => {
    setupBase({ phone: "+994501234567", message: "Hi" })
    state.sendSmsResult = { success: false, error: "ATL 118: not enough units" }

    const result = await processEnrollmentStep("enr_1", "org_1")

    expect(result.status).toBe("completed")
    expect(result.message).toContain("SMS error: ATL 118")
  })
})
