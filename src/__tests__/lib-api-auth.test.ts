import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: { findFirst: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    user: { findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}))

vi.mock("@/lib/permissions", () => ({
  checkPermission: vi.fn().mockReturnValue(true),
  resolveModuleFromPath: vi.fn().mockReturnValue(null),
  methodToAction: vi.fn().mockReturnValue("read"),
}))

vi.mock("@/lib/modules", () => ({
  hasModule: vi.fn().mockReturnValue(true),
  MODULE_REGISTRY: {},
}))

vi.mock("@/lib/mobile-auth", () => ({
  getMobileAuth: vi.fn().mockReturnValue(null),
}))

vi.mock("crypto", () => ({
  default: {
    createHash: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        digest: vi.fn().mockReturnValue("hashed-key"),
      }),
    }),
  },
}))

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { checkPermission, resolveModuleFromPath, methodToAction } from "@/lib/permissions"
import { getMobileAuth } from "@/lib/mobile-auth"
import { getSession, getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRequest(url: string, method = "GET", headers?: Record<string, string>) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: headers || {},
  })
}

const validSession = {
  user: {
    id: "user-1",
    email: "test@test.com",
    name: "Test User",
    organizationId: "org-1",
    role: "admin",
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// getSession
// ===========================================================================
describe("getSession", () => {
  it("returns AuthResult from valid session", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any)
    const result = await getSession(makeRequest("/api/v1/contacts"))
    expect(result).toEqual({
      orgId: "org-1",
      userId: "user-1",
      role: "admin",
      email: "test@test.com",
      name: "Test User",
    })
  })

  it("returns null when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const result = await getSession(makeRequest("/api/v1/contacts"))
    expect(result).toBeNull()
  })

  it("returns null when session has no user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: null } as any)
    const result = await getSession(makeRequest("/api/v1/contacts"))
    expect(result).toBeNull()
  })

  it("returns null when auth() throws", async () => {
    vi.mocked(auth).mockRejectedValue(new Error("auth failure"))
    const result = await getSession(makeRequest("/api/v1/contacts"))
    expect(result).toBeNull()
  })

  it("defaults role to viewer when missing", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u-1", email: "a@b.com", name: "A", organizationId: "o-1" } } as any)
    const result = await getSession(makeRequest("/api/v1/contacts"))
    expect(result?.role).toBe("viewer")
  })
})

// ===========================================================================
// getOrgId
// ===========================================================================
describe("getOrgId", () => {
  it("returns orgId from session", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any)
    const orgId = await getOrgId(makeRequest("/api/v1/contacts"))
    expect(orgId).toBe("org-1")
  })

  it("falls back to mobile auth when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue({
      agentId: "agent-1",
      userId: "user-1",
      orgId: "org-mobile",
      email: "agent@test.com",
      name: "Agent",
      role: "agent",
    })

    const orgId = await getOrgId(makeRequest("/api/v1/contacts"))
    expect(orgId).toBe("org-mobile")
  })

  it("falls back to API key auth with scope check", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue(null)
    vi.mocked(resolveModuleFromPath).mockReturnValue("contacts" as any)
    vi.mocked(methodToAction).mockReturnValue("read" as any)

    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      organizationId: "org-api",
      createdBy: "user-1",
      name: "Test Key",
      scopes: ["read:contacts"],
      expiresAt: null,
    } as any)

    const req = makeRequest("/api/v1/contacts", "GET", { authorization: "Bearer ld_test_key_123" })
    const orgId = await getOrgId(req)
    expect(orgId).toBe("org-api")
  })

  it("returns null when API key lacks required scope", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue(null)
    vi.mocked(resolveModuleFromPath).mockReturnValue("deals" as any)
    vi.mocked(methodToAction).mockReturnValue("read" as any)

    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      organizationId: "org-api",
      createdBy: "user-1",
      name: "Test Key",
      scopes: ["read:contacts"],
      expiresAt: null,
    } as any)

    const req = makeRequest("/api/v1/deals", "GET", { authorization: "Bearer ld_test_key_123" })
    const orgId = await getOrgId(req)
    expect(orgId).toBeNull()
  })

  it("returns null when all auth methods fail", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue(null)
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null)

    const orgId = await getOrgId(makeRequest("/api/v1/contacts"))
    expect(orgId).toBeNull()
  })
})

// ===========================================================================
// requireAuth
// ===========================================================================
describe("requireAuth", () => {
  it("returns AuthResult for valid session", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      isActive: true, plan: "starter", addons: [], features: [],
    } as any)

    const result = await requireAuth(makeRequest("/api/v1/contacts"))
    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).orgId).toBe("org-1")
    expect((result as any).userId).toBe("user-1")
  })

  it("returns 401 when no auth available", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue(null)
    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue(null)

    const result = await requireAuth(makeRequest("/api/v1/contacts"))
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
  })

  it("returns AuthResult via mobile auth fallback", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue({
      agentId: "agent-1",
      userId: "user-m",
      orgId: "org-m",
      email: "agent@test.com",
      name: "Agent",
      role: "agent",
    })

    const result = await requireAuth(makeRequest("/api/v1/contacts"))
    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).orgId).toBe("org-m")
  })

  it("returns 403 for permission denied", async () => {
    vi.mocked(auth).mockResolvedValue(validSession as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue("settings" as any)
    vi.mocked(methodToAction).mockReturnValue("write" as any)
    vi.mocked(checkPermission).mockReturnValue(false)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      isActive: true, plan: "starter", addons: [], features: [],
    } as any)

    const result = await requireAuth(makeRequest("/api/v1/settings", "POST"))
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
  })

  it("returns 403 for inactive organization", async () => {
    // Use a unique orgId to avoid the in-memory orgCache from previous tests
    const uniqueOrgId = `org-inactive-${Date.now()}`
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, organizationId: uniqueOrgId },
    } as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      isActive: false,
      plan: "starter",
      addons: [],
      features: [],
    } as any)

    const result = await requireAuth(makeRequest("/api/v1/contacts"))
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
    const json = await (result as NextResponse).json()
    expect(json.error).toContain("deactivated")
  })

  it("returns 403 when 2FA verification is pending (needs2fa)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, needs2fa: true },
    } as any)

    const result = await requireAuth(makeRequest("/api/v1/contacts"))
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
    const json = await (result as NextResponse).json()
    expect(json.error).toContain("2FA")
  })

  it("returns 403 when 2FA setup is pending (needsSetup2fa)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, needsSetup2fa: true },
    } as any)

    const result = await requireAuth(makeRequest("/api/v1/contacts"))
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
  })

  it("returns 401 when password was changed after JWT issued", async () => {
    const tokenIat = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
    // Use unique orgId/userId to avoid in-memory cache from other tests
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, id: "user-pw-expired", organizationId: "org-pw-test" },
      token: { iat: tokenIat },
    } as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      isActive: true, plan: "starter", addons: [], features: [],
    } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      passwordChangedAt: new Date(), // just now — after token was issued
    } as any)

    const result = await requireAuth(makeRequest("/api/v1/contacts"))
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
    const json = await (result as NextResponse).json()
    expect(json.error).toContain("expired")
  })

  it("returns AuthResult via API key fallback with valid scope", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue(null)
    vi.mocked(resolveModuleFromPath).mockReturnValue("contacts" as any)
    vi.mocked(methodToAction).mockReturnValue("read" as any)

    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      organizationId: "org-api",
      createdBy: "user-api",
      name: "API Key",
      scopes: ["read:contacts"],
      expiresAt: null,
    } as any)

    const req = makeRequest("/api/v1/contacts", "GET", { authorization: "Bearer ld_test_key" })
    const result = await requireAuth(req, "contacts", "read")
    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).orgId).toBe("org-api")
  })

  it("returns 403 when API key missing required scope", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue(null)

    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      organizationId: "org-api",
      createdBy: "user-api",
      name: "API Key",
      scopes: ["read:contacts"],
      expiresAt: null,
    } as any)

    const req = makeRequest("/api/v1/deals", "POST", { authorization: "Bearer ld_test_key" })
    const result = await requireAuth(req, "deals", "write")
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
  })

  // ─── Cross-tenant binding (defense-in-depth) ─────────────
  // Middleware already blocks mismatched subdomain+session at the edge, but
  // a direct API call (Host-spoof, race, or someone stripping middleware)
  // must also be blocked by requireAuth. When x-tenant-slug is set, it must
  // match the slug of the session's organization.

  it("returns 403 when x-tenant-slug does not match session org slug", async () => {
    // Session for LeadDrive org; request coming to afigroup.leaddrivecrm.org
    const uniqueOrgId = `org-leaddrive-${Date.now()}`
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, organizationId: uniqueOrgId },
    } as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: uniqueOrgId,
      slug: "leaddrive", // actual slug on the org row
      isActive: true,
      plan: "starter",
      addons: [],
      features: [],
    } as any)

    const req = makeRequest("/api/v1/contacts", "GET", { "x-tenant-slug": "afigroup" })
    const result = await requireAuth(req)
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
    const json = await (result as NextResponse).json()
    expect(json.error).toContain("Cross-tenant")
  })

  it("passes when x-tenant-slug matches session org slug", async () => {
    const uniqueOrgId = `org-afi-${Date.now()}`
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, organizationId: uniqueOrgId },
    } as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: uniqueOrgId,
      slug: "afigroup",
      isActive: true,
      plan: "starter",
      addons: [],
      features: [],
    } as any)

    const req = makeRequest("/api/v1/contacts", "GET", { "x-tenant-slug": "afigroup" })
    const result = await requireAuth(req)
    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).orgId).toBe(uniqueOrgId)
  })

  it("superadmin bypasses cross-tenant check", async () => {
    const uniqueOrgId = `org-sa-${Date.now()}`
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, organizationId: uniqueOrgId, role: "superadmin" },
    } as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: uniqueOrgId,
      slug: "leaddrive",
      isActive: true,
      plan: "starter",
      addons: [],
      features: [],
    } as any)

    // Superadmin on afigroup subdomain — should pass even with mismatch.
    const req = makeRequest("/api/v1/contacts", "GET", { "x-tenant-slug": "afigroup" })
    const result = await requireAuth(req)
    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).role).toBe("superadmin")
  })

  it("returns 403 when API-key's org slug does not match x-tenant-slug", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    vi.mocked(getMobileAuth).mockReturnValue(null)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    const uniqueOrgId = `org-apikey-xt-${Date.now()}`

    vi.mocked(prisma.apiKey.findFirst).mockResolvedValue({
      id: "key-1",
      organizationId: uniqueOrgId,
      createdBy: "user-api",
      name: "API Key",
      scopes: ["read:contacts"],
      expiresAt: null,
    } as any)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: uniqueOrgId,
      slug: "leaddrive",
    } as any)

    const req = makeRequest("/api/v1/contacts", "GET", {
      authorization: "Bearer ld_test_key",
      "x-tenant-slug": "afigroup",
    })
    const result = await requireAuth(req)
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
    const json = await (result as NextResponse).json()
    expect(json.error).toContain("Cross-tenant")
  })

  it("does not run cross-tenant check when x-tenant-slug is absent", async () => {
    // e.g. app.leaddrivecrm.org or marketing — middleware doesn't inject
    // x-tenant-slug there. requireAuth must still succeed on normal auth.
    const uniqueOrgId = `org-noslug-${Date.now()}`
    vi.mocked(auth).mockResolvedValue({
      user: { ...validSession.user, organizationId: uniqueOrgId },
    } as any)
    vi.mocked(resolveModuleFromPath).mockReturnValue(null)
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      id: uniqueOrgId,
      slug: "leaddrive",
      isActive: true,
      plan: "starter",
      addons: [],
      features: [],
    } as any)

    const req = makeRequest("/api/v1/contacts", "GET")
    const result = await requireAuth(req)
    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).orgId).toBe(uniqueOrgId)
  })
})

// ===========================================================================
// isAuthError
// ===========================================================================
describe("isAuthError", () => {
  it("returns true for NextResponse", () => {
    const response = NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    expect(isAuthError(response)).toBe(true)
  })

  it("returns false for AuthResult", () => {
    const authResult = {
      orgId: "org-1",
      userId: "user-1",
      role: "admin" as const,
      email: "test@test.com",
      name: "Test",
    }
    expect(isAuthError(authResult as any)).toBe(false)
  })
})
