import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn(), update: vi.fn() },
    organization: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/constants", () => ({
  DEFAULT_PIPELINE_STAGES: [{ name: "New", order: 0 }],
  INITIAL_CURRENCIES: [{ code: "USD", name: "US Dollar", symbol: "$" }],
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password") },
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("crypto", () => ({
  default: { randomBytes: vi.fn().mockReturnValue({ toString: () => "mock-reset-token" }) },
}))

import { POST as forgotPOST } from "@/app/api/v1/auth/forgot-password/route"
import { POST as resetPOST } from "@/app/api/v1/auth/reset-password/route"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

function makeRequest(url: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/forgot-password", () => {
  it("returns 400 when email is missing", async () => {
    const res = await forgotPOST(makeRequest("/api/v1/auth/forgot-password", {}))
    expect(res.status).toBe(400)
  })

  it("returns success even when user does not exist (prevent enumeration)", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    const res = await forgotPOST(makeRequest("/api/v1/auth/forgot-password", { email: "noone@test.com" }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("generates reset token and sends email when user exists", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      name: "Test",
      email: "test@test.com",
      organizationId: "org-1",
    } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await forgotPOST(makeRequest("/api/v1/auth/forgot-password", { email: "test@test.com" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ resetToken: "mock-reset-token" }),
      })
    )
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "test@test.com", organizationId: "org-1" })
    )
  })

  it("does not send email for inactive users", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    const res = await forgotPOST(makeRequest("/api/v1/auth/forgot-password", { email: "inactive@test.com" }))
    expect(res.status).toBe(200)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("sets resetTokenExp to approximately 1 hour from now", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      name: "Test",
      email: "t@t.com",
      organizationId: "org-1",
    } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    await forgotPOST(makeRequest("/api/v1/auth/forgot-password", { email: "t@t.com" }))

    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0]
    const exp = (updateCall as any).data.resetTokenExp as Date
    const diffMs = exp.getTime() - Date.now()
    // Should be about 1 hour (3600000 ms), allow 5s tolerance
    expect(diffMs).toBeGreaterThan(3595000)
    expect(diffMs).toBeLessThan(3605000)
  })
})

// ---------------------------------------------------------------------------
// Reset Password
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/reset-password", () => {
  it("returns 400 when token is missing", async () => {
    const res = await resetPOST(makeRequest("/api/v1/auth/reset-password", { password: "newpass123" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when password is missing", async () => {
    const res = await resetPOST(makeRequest("/api/v1/auth/reset-password", { token: "some-token" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await resetPOST(makeRequest("/api/v1/auth/reset-password", { token: "tok", password: "short" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 when token is invalid or expired", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
    const res = await resetPOST(makeRequest("/api/v1/auth/reset-password", { token: "bad-token", password: "newpass123" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid|expired/i)
  })

  it("resets password, clears token, and sets passwordChangedAt", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      isActive: true,
      resetToken: "valid-token",
      resetTokenExp: new Date(Date.now() + 3600000),
    } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await resetPOST(makeRequest("/api/v1/auth/reset-password", { token: "valid-token", password: "newpass123" }))
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          passwordHash: "hashed-password",
          resetToken: null,
          resetTokenExp: null,
        }),
      })
    )

    const updateData = vi.mocked(prisma.user.update).mock.calls[0][0].data as any
    expect(updateData.passwordChangedAt).toBeInstanceOf(Date)
  })
})
