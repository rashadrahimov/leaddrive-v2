import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    account: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getSession: vi.fn(),
}))

vi.mock("otplib", () => ({
  generateSecret: vi.fn().mockReturnValue("MOCK_SECRET_BASE32"),
  generateURI: vi.fn().mockReturnValue("otpauth://totp/LeadDrive%20CRM:test@test.com?secret=MOCK_SECRET_BASE32&issuer=LeadDrive%20CRM"),
  verifySync: vi.fn(),
}))

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK_QR") },
}))

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}))

vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: () => "abcd1234",
    }),
  },
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"
import { verifySync } from "otplib"
import bcrypt from "bcryptjs"

import { GET as twoFaGET, POST as twoFaPOST } from "@/app/api/v1/auth/2fa/route"
import { POST as totpSetupPOST } from "@/app/api/v1/auth/totp/setup/route"
import { POST as totpVerifyPOST } from "@/app/api/v1/auth/totp/verify/route"
import { POST as totpDisablePOST } from "@/app/api/v1/auth/totp/disable/route"
import { GET as totpStatusGET } from "@/app/api/v1/auth/totp/status/route"
import { POST as verify2faPOST } from "@/app/api/v1/auth/verify-2fa/route"
import { GET as linkedAccountsGET, DELETE as linkedAccountsDELETE } from "@/app/api/v1/auth/linked-accounts/route"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(url: string, method = "GET", body?: Record<string, unknown>) {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

const mockSession = {
  user: { id: "user-1", email: "test@test.com", name: "Test", organizationId: "org-1", role: "admin" },
}

const mockUser = {
  id: "user-1",
  email: "test@test.com",
  totpSecret: "EXISTING_SECRET",
  totpEnabled: true,
  passwordHash: "$2a$10$hashedpassword",
  backupCodes: JSON.stringify(["ABCD-1234", "EFGH-5678"]),
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// GET /api/v1/auth/2fa — get 2FA status
// ===========================================================================
describe("GET /api/v1/auth/2fa", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await twoFaGET(makeRequest("/api/v1/auth/2fa"))
    expect(res.status).toBe(401)
  })

  it("returns 2FA enabled status", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ totpEnabled: true, email: "test@test.com" } as any)
    const res = await twoFaGET(makeRequest("/api/v1/auth/2fa"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.enabled).toBe(true)
  })

  it("returns false when TOTP not enabled", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ totpEnabled: false, email: "test@test.com" } as any)
    const res = await twoFaGET(makeRequest("/api/v1/auth/2fa"))
    const json = await res.json()
    expect(json.data.enabled).toBe(false)
  })
})

// ===========================================================================
// POST /api/v1/auth/2fa — setup / verify / disable / validate
// ===========================================================================
describe("POST /api/v1/auth/2fa", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "setup" }))
    expect(res.status).toBe(401)
  })

  it("returns 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "setup" }))
    expect(res.status).toBe(404)
  })

  // setup
  it("setup: generates secret, QR code, and backup codes", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpEnabled: false } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "setup" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.secret).toBe("MOCK_SECRET_BASE32")
    expect(json.data.qrCode).toContain("data:image")
    expect(json.data.backupCodes).toHaveLength(8)
  })

  // verify
  it("verify: returns 400 when code is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "verify" }))
    expect(res.status).toBe(400)
  })

  it("verify: returns 400 when totp secret not set", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpSecret: null } as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "verify", code: "123456" }))
    expect(res.status).toBe(400)
  })

  it("verify: returns 400 for invalid code", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: false } as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "verify", code: "000000" }))
    expect(res.status).toBe(400)
  })

  it("verify: enables 2FA and returns nonce on valid code", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: true } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "verify", code: "123456" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.twoFactorNonce).toBeDefined()
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totpEnabled: true }) })
    )
  })

  // disable
  it("disable: returns 400 when code is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "disable" }))
    expect(res.status).toBe(400)
  })

  it("disable: returns 400 when 2FA not enabled", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpEnabled: false, totpSecret: null } as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "disable", code: "123456" }))
    expect(res.status).toBe(400)
  })

  it("disable: returns 400 for invalid code", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: false } as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "disable", code: "999999" }))
    expect(res.status).toBe(400)
  })

  it("disable: disables 2FA on valid code", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: true } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "disable", code: "123456" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totpEnabled: false, totpSecret: null }) })
    )
  })

  // validate
  it("validate: returns valid true when 2FA not enabled", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpEnabled: false, totpSecret: null } as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "validate", code: "123456" }))
    const json = await res.json()
    expect(json.data.valid).toBe(true)
  })

  it("validate: returns valid status based on code check", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: true } as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "validate", code: "123456" }))
    const json = await res.json()
    expect(json.data.valid).toBe(true)
  })

  // invalid action
  it("returns 400 for unknown action", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    const res = await twoFaPOST(makeRequest("/api/v1/auth/2fa", "POST", { action: "unknown" }))
    expect(res.status).toBe(400)
  })
})

// ===========================================================================
// POST /api/v1/auth/totp/setup
// ===========================================================================
describe("POST /api/v1/auth/totp/setup", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await totpSetupPOST(makeRequest("/api/v1/auth/totp/setup", "POST"))
    expect(res.status).toBe(401)
  })

  it("returns 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await totpSetupPOST(makeRequest("/api/v1/auth/totp/setup", "POST"))
    expect(res.status).toBe(404)
  })

  it("returns 400 when 2FA is already enabled", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpEnabled: true } as any)
    const res = await totpSetupPOST(makeRequest("/api/v1/auth/totp/setup", "POST"))
    expect(res.status).toBe(400)
  })

  it("generates secret and QR code for new setup", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpEnabled: false } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await totpSetupPOST(makeRequest("/api/v1/auth/totp/setup", "POST"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.secret).toBe("MOCK_SECRET_BASE32")
    expect(json.data.qrCode).toContain("data:image")
    expect(json.data.otpauth).toContain("otpauth://totp")
  })
})

// ===========================================================================
// POST /api/v1/auth/totp/verify
// ===========================================================================
describe("POST /api/v1/auth/totp/verify", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await totpVerifyPOST(makeRequest("/api/v1/auth/totp/verify", "POST", { token: "123456" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when token is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    const res = await totpVerifyPOST(makeRequest("/api/v1/auth/totp/verify", "POST", {}))
    expect(res.status).toBe(400)
  })

  it("returns 400 when TOTP setup not started", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpSecret: null } as any)
    const res = await totpVerifyPOST(makeRequest("/api/v1/auth/totp/verify", "POST", { token: "123456" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid token", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: false } as any)
    const res = await totpVerifyPOST(makeRequest("/api/v1/auth/totp/verify", "POST", { token: "000000" }))
    expect(res.status).toBe(400)
  })

  it("enables 2FA and returns backup codes and nonce on valid token", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: true } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await totpVerifyPOST(makeRequest("/api/v1/auth/totp/verify", "POST", { token: "123456" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.backupCodes).toBeDefined()
    expect(json.data.twoFactorNonce).toBeDefined()
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totpEnabled: true }) })
    )
  })
})

// ===========================================================================
// POST /api/v1/auth/totp/disable
// ===========================================================================
describe("POST /api/v1/auth/totp/disable", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await totpDisablePOST(makeRequest("/api/v1/auth/totp/disable", "POST", { password: "pass" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when password is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    const res = await totpDisablePOST(makeRequest("/api/v1/auth/totp/disable", "POST", {}))
    expect(res.status).toBe(400)
  })

  it("returns 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await totpDisablePOST(makeRequest("/api/v1/auth/totp/disable", "POST", { password: "pass" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 when 2FA is not enabled", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpEnabled: false } as any)
    const res = await totpDisablePOST(makeRequest("/api/v1/auth/totp/disable", "POST", { password: "pass" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid password", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    const res = await totpDisablePOST(makeRequest("/api/v1/auth/totp/disable", "POST", { password: "wrong" }))
    expect(res.status).toBe(400)
  })

  it("disables 2FA on valid password", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await totpDisablePOST(makeRequest("/api/v1/auth/totp/disable", "POST", { password: "correct" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totpEnabled: false, totpSecret: null, backupCodes: "[]" }),
      })
    )
  })
})

// ===========================================================================
// GET /api/v1/auth/totp/status
// ===========================================================================
describe("GET /api/v1/auth/totp/status", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await totpStatusGET()
    expect(res.status).toBe(401)
  })

  it("returns 404 when user not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await totpStatusGET()
    expect(res.status).toBe(404)
  })

  it("returns totpEnabled and hasBackupCodes", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      totpEnabled: true,
      backupCodes: JSON.stringify(["ABCD-1234"]),
    } as any)

    const res = await totpStatusGET()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.totpEnabled).toBe(true)
    expect(json.data.hasBackupCodes).toBe(true)
  })

  it("returns hasBackupCodes false when backup codes empty", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      totpEnabled: true,
      backupCodes: "[]",
    } as any)

    const res = await totpStatusGET()
    const json = await res.json()
    expect(json.data.hasBackupCodes).toBe(false)
  })
})

// ===========================================================================
// POST /api/v1/auth/verify-2fa
// ===========================================================================
describe("POST /api/v1/auth/verify-2fa", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await verify2faPOST(makeRequest("/api/v1/auth/verify-2fa", "POST", { code: "123456" }))
    expect(res.status).toBe(401)
  })

  it("returns 400 when code is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    const res = await verify2faPOST(makeRequest("/api/v1/auth/verify-2fa", "POST", {}))
    expect(res.status).toBe(400)
  })

  it("returns 400 when 2FA not enabled on user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...mockUser, totpEnabled: false, totpSecret: null } as any)
    const res = await verify2faPOST(makeRequest("/api/v1/auth/verify-2fa", "POST", { code: "123456" }))
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid TOTP code", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: false } as any)
    const res = await verify2faPOST(makeRequest("/api/v1/auth/verify-2fa", "POST", { code: "000000" }))
    expect(res.status).toBe(400)
  })

  it("verifies valid TOTP code and returns nonce", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(verifySync).mockReturnValue({ valid: true } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await verify2faPOST(makeRequest("/api/v1/auth/verify-2fa", "POST", { code: "123456" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.verified).toBe(true)
    expect(json.data.twoFactorNonce).toBeDefined()
  })

  it("verifies valid backup code and removes it", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      backupCodes: ["ABCD-1234", "EFGH-5678"],
    } as any)
    vi.mocked(verifySync).mockReturnValue({ valid: false } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const res = await verify2faPOST(makeRequest("/api/v1/auth/verify-2fa", "POST", { code: "ABCD1234" }))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.verified).toBe(true)

    // Should have been called twice: once to remove backup code, once to set nonce
    expect(prisma.user.update).toHaveBeenCalledTimes(2)
  })
})

// ===========================================================================
// GET /api/v1/auth/linked-accounts
// ===========================================================================
describe("GET /api/v1/auth/linked-accounts", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await linkedAccountsGET(makeRequest("/api/v1/auth/linked-accounts"))
    expect(res.status).toBe(401)
  })

  it("returns list of linked accounts", async () => {
    vi.mocked(getSession).mockResolvedValue({
      orgId: "org-1",
      userId: "user-1",
      role: "admin" as any,
      email: "test@test.com",
      name: "Test",
    })
    vi.mocked(prisma.account.findMany).mockResolvedValue([
      { id: "acc-1", provider: "google", type: "oauth", providerAccountId: "g-123" },
    ] as any)

    const res = await linkedAccountsGET(makeRequest("/api/v1/auth/linked-accounts"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].provider).toBe("google")
  })
})

// ===========================================================================
// DELETE /api/v1/auth/linked-accounts
// ===========================================================================
describe("DELETE /api/v1/auth/linked-accounts", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await linkedAccountsDELETE(
      makeRequest("/api/v1/auth/linked-accounts", "DELETE", { accountId: "acc-1" })
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 when unlinking the only login method without password", async () => {
    vi.mocked(getSession).mockResolvedValue({
      orgId: "org-1", userId: "user-1", role: "admin" as any, email: "test@test.com", name: "Test",
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ passwordHash: null } as any)
    vi.mocked(prisma.account.count).mockResolvedValue(1)

    const res = await linkedAccountsDELETE(
      makeRequest("/api/v1/auth/linked-accounts", "DELETE", { accountId: "acc-1" })
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when account not found or not owned", async () => {
    vi.mocked(getSession).mockResolvedValue({
      orgId: "org-1", userId: "user-1", role: "admin" as any, email: "test@test.com", name: "Test",
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ passwordHash: "hash" } as any)
    vi.mocked(prisma.account.count).mockResolvedValue(2)
    vi.mocked(prisma.account.findFirst).mockResolvedValue(null)

    const res = await linkedAccountsDELETE(
      makeRequest("/api/v1/auth/linked-accounts", "DELETE", { accountId: "acc-999" })
    )
    expect(res.status).toBe(404)
  })

  it("deletes linked account successfully", async () => {
    vi.mocked(getSession).mockResolvedValue({
      orgId: "org-1", userId: "user-1", role: "admin" as any, email: "test@test.com", name: "Test",
    })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ passwordHash: "hash" } as any)
    vi.mocked(prisma.account.count).mockResolvedValue(2)
    vi.mocked(prisma.account.findFirst).mockResolvedValue({ id: "acc-1", userId: "user-1" } as any)
    vi.mocked(prisma.account.delete).mockResolvedValue({} as any)

    const res = await linkedAccountsDELETE(
      makeRequest("/api/v1/auth/linked-accounts", "DELETE", { accountId: "acc-1" })
    )
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.account.delete).toHaveBeenCalledWith({ where: { id: "acc-1" } })
  })
})
