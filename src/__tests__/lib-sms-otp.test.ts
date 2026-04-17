import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/prisma", () => ({
  prisma: {
    otpCode: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    channelConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}))

// bcryptjs is loaded as default export or named exports depending on interop.
// We only need hash + compare for OTP flows.
vi.mock("bcryptjs", () => {
  const hash = vi.fn(async (plain: string) => `HASH(${plain})`)
  const compare = vi.fn(async (plain: string, hashed: string) => hashed === `HASH(${plain})`)
  return { default: { hash, compare }, hash, compare }
})

// Block real Twilio HTTP calls — we don't care about the provider in these tests.
global.fetch = vi.fn(async () => ({
  ok: true,
  json: async () => ({ sid: "SM_MOCK" }),
  text: async () => "",
})) as any

import { prisma } from "@/lib/prisma"
import { sendOtp, verifyOtp } from "@/lib/sms"

beforeEach(() => {
  vi.clearAllMocks()
  // Default: pretend Twilio env is configured so sendSms doesn't short-circuit.
  process.env.TWILIO_ACCOUNT_SID = "AC_TEST"
  process.env.TWILIO_AUTH_TOKEN = "TOKEN_TEST"
  process.env.TWILIO_FROM_NUMBER = "+10000000000"
})

describe("sendOtp", () => {
  it("creates a new OtpCode with hashed value and invalidates prior codes", async () => {
    ;(prisma.otpCode.updateMany as any).mockResolvedValue({ count: 0 })
    ;(prisma.otpCode.create as any).mockResolvedValue({ id: "otp_1" })

    const res = await sendOtp({ phone: "+15551234567", purpose: "login" })

    expect(res.success).toBe(true)
    // Prior codes for same phone+purpose are invalidated first
    expect(prisma.otpCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          phone: "+15551234567",
          purpose: "login",
          usedAt: null,
        }),
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      })
    )
    // New code is stored hashed, never as plaintext
    const createCall = (prisma.otpCode.create as any).mock.calls[0][0]
    expect(createCall.data.codeHash).toMatch(/^HASH\(\d{6}\)$/)
    expect(createCall.data.phone).toBe("+15551234567")
    expect(createCall.data.purpose).toBe("login")
    // 10-min TTL
    const ttl = createCall.data.expiresAt.getTime() - Date.now()
    expect(ttl).toBeGreaterThan(9 * 60 * 1000)
    expect(ttl).toBeLessThanOrEqual(10 * 60 * 1000 + 1000)
  })

  it("returns success=false when SMS provider is not configured", async () => {
    delete process.env.TWILIO_ACCOUNT_SID
    ;(prisma.otpCode.updateMany as any).mockResolvedValue({ count: 0 })
    ;(prisma.otpCode.create as any).mockResolvedValue({ id: "otp_1" })

    const res = await sendOtp({ phone: "+15551234567", purpose: "verification" })

    expect(res.success).toBe(false)
    expect(res.error).toMatch(/not configured/i)
  })

  it("exposes debugCode only when NODE_ENV != production AND OTP_EXPOSE_DEBUG_CODE=1", async () => {
    ;(prisma.otpCode.updateMany as any).mockResolvedValue({ count: 0 })
    ;(prisma.otpCode.create as any).mockResolvedValue({ id: "otp_1" })

    const prevEnv = process.env.NODE_ENV
    const prevFlag = process.env.OTP_EXPOSE_DEBUG_CODE

    // dev + explicit opt-in → exposed
    process.env.NODE_ENV = "development"
    process.env.OTP_EXPOSE_DEBUG_CODE = "1"
    const devOpen = await sendOtp({ phone: "+15550000001", purpose: "login" })
    expect(devOpen.debugCode).toMatch(/^\d{6}$/)

    // dev without opt-in → hidden
    delete process.env.OTP_EXPOSE_DEBUG_CODE
    const devClosed = await sendOtp({ phone: "+15550000001", purpose: "login" })
    expect(devClosed.debugCode).toBeUndefined()

    // production even with opt-in → still hidden (belt-and-braces)
    process.env.NODE_ENV = "production"
    process.env.OTP_EXPOSE_DEBUG_CODE = "1"
    const prodRes = await sendOtp({ phone: "+15550000002", purpose: "login" })
    expect(prodRes.debugCode).toBeUndefined()

    process.env.NODE_ENV = prevEnv
    if (prevFlag === undefined) delete process.env.OTP_EXPOSE_DEBUG_CODE
    else process.env.OTP_EXPOSE_DEBUG_CODE = prevFlag
  })
})

describe("verifyOtp", () => {
  const phone = "+15551234567"

  it("returns success for valid unexpired code and marks it used", async () => {
    ;(prisma.otpCode.findFirst as any).mockResolvedValue({
      id: "otp_1",
      codeHash: "HASH(123456)",
      attempts: 0,
    })
    ;(prisma.otpCode.update as any).mockResolvedValue({})

    const res = await verifyOtp(phone, "123456", "login")
    expect(res.success).toBe(true)
    expect(prisma.otpCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "otp_1" },
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      })
    )
  })

  it("rejects non-numeric code without a DB lookup", async () => {
    const res = await verifyOtp(phone, "abc123", "login")
    expect(res.success).toBe(false)
    expect(prisma.otpCode.findFirst).not.toHaveBeenCalled()
  })

  it("rejects when no active code exists", async () => {
    ;(prisma.otpCode.findFirst as any).mockResolvedValue(null)
    const res = await verifyOtp(phone, "999999", "login")
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/expired|not found/i)
  })

  it("increments attempts on wrong code", async () => {
    ;(prisma.otpCode.findFirst as any).mockResolvedValue({
      id: "otp_1",
      codeHash: "HASH(111111)",
      attempts: 2,
    })
    ;(prisma.otpCode.update as any).mockResolvedValue({})

    const res = await verifyOtp(phone, "222222", "login")
    expect(res.success).toBe(false)
    expect(prisma.otpCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "otp_1" },
        data: expect.objectContaining({ attempts: { increment: 1 } }),
      })
    )
  })

  it("locks out record after MAX_VERIFY_ATTEMPTS (5)", async () => {
    ;(prisma.otpCode.findFirst as any).mockResolvedValue({
      id: "otp_1",
      codeHash: "HASH(333333)",
      attempts: 5,
    })
    ;(prisma.otpCode.update as any).mockResolvedValue({})

    const res = await verifyOtp(phone, "333333", "login")
    expect(res.success).toBe(false)
    expect(res.error).toMatch(/too many/i)
    // The record should be marked used (locked) so further attempts don't match
    expect(prisma.otpCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usedAt: expect.any(Date) }),
      })
    )
  })
})
