import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock rate-limit before importing middleware
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => true),
  hashForRateLimit: vi.fn(async (v: string) => `hash_${v.slice(0, 8)}`),
  RATE_LIMIT_CONFIG: {
    api: { maxRequests: 100, windowMs: 60000 },
    ai: { maxRequests: 20, windowMs: 60000 },
    public: { maxRequests: 10, windowMs: 60000 },
    apiKey: { maxRequests: 300, windowMs: 60000 },
    webhook: { maxRequests: 600, windowMs: 60000 },
  },
}))

// Mock next-auth's `auth` wrapper — it wraps a callback that receives (req) with req.auth set.
// We simulate this by calling the callback directly.
vi.mock("@/lib/auth", () => ({
  auth: (cb: Function) => cb,
}))

import { checkRateLimit } from "@/lib/rate-limit"
import { NextRequest } from "next/server"

// We import the default export which, thanks to our mock, is the raw callback function.
import authMiddleware from "@/middleware"

/** Helper to build a NextRequest-like object that the middleware callback expects */
function makeReq(opts: {
  pathname?: string
  host?: string
  method?: string
  auth?: any
  headers?: Record<string, string>
  cookies?: Record<string, string>
}) {
  const pathname = opts.pathname ?? "/dashboard"
  const host = opts.host ?? "localhost"
  const origin = `http://${host}`
  const url = new URL(pathname, origin)

  const headersInit: Record<string, string> = {
    host,
    ...opts.headers,
  }

  const req = new NextRequest(url, {
    method: opts.method ?? "GET",
    headers: headersInit,
  })

  // Attach auth session (NextAuth middleware pattern)
  ;(req as any).auth = opts.auth ?? null

  // nextUrl is read-only on NextRequest, but it already equals `url`
  // Attach cookies helper
  if (opts.cookies) {
    for (const [k, v] of Object.entries(opts.cookies)) {
      req.cookies.set(k, v)
    }
  }

  return req
}

describe("middleware", async () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: rate limit allows
    vi.mocked(checkRateLimit).mockReturnValue(true)
    // Reset env so CRM_ONLY_MODE is effectively true for localhost tests
    process.env.NEXT_PUBLIC_MARKETING_URL = "https://leaddrivecrm.org"
    process.env.NEXT_PUBLIC_APP_URL = "https://app.leaddrivecrm.org"
  })

  // ─── Auth redirect ────────────────────────────────────────

  it("redirects unauthenticated users from /dashboard to /login", async () => {
    const req = makeReq({ pathname: "/dashboard", auth: null })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login")
    expect(res.headers.get("location")).toContain("callbackUrl=%2Fdashboard")
  })

  it("redirects unauthenticated root '/' to /login", async () => {
    const req = makeReq({ pathname: "/", auth: null })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login")
  })

  // ─── Public paths ─────────────────────────────────────────

  it("allows /login without authentication", async () => {
    const req = makeReq({ pathname: "/login", auth: null })
    const res = await authMiddleware(req)
    // Should pass through (200), not redirect
    expect(res.status).toBe(200)
  })

  it("allows /portal paths without authentication", async () => {
    const req = makeReq({ pathname: "/portal/tickets", auth: null })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
  })

  it("allows /api/health without authentication", async () => {
    const req = makeReq({ pathname: "/api/health", auth: null })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
  })

  // ─── Header injection ─────────────────────────────────────

  it("injects x-organization-id, x-user-id, x-user-role for authenticated users", async () => {
    const session = {
      user: { id: "u1", organizationId: "org-42", role: "admin" },
    }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
    // Headers are set on the request headers forwarded via NextResponse.next({ headers })
    expect(res.headers.get("x-organization-id")).toBe("org-42")
    expect(res.headers.get("x-user-id")).toBe("u1")
    expect(res.headers.get("x-user-role")).toBe("admin")
  })

  it("injects x-nonce header", async () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "viewer" } }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = await authMiddleware(req)
    expect(res.headers.get("x-nonce")).toBeTruthy()
  })

  // ─── Rate limiting ────────────────────────────────────────

  it("returns 429 when auth rate limit is exceeded on POST /login", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const req = makeReq({ pathname: "/login", method: "POST", auth: null })
    const res = await authMiddleware(req)
    expect(res.status).toBe(429)
  })

  it("does not rate-limit GET requests on auth paths", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const req = makeReq({ pathname: "/login", method: "GET", auth: null })
    const res = await authMiddleware(req)
    // GET on /login is a public path, should pass through (200)
    expect(res.status).toBe(200)
  })

  // ─── 2FA enforcement ──────────────────────────────────────

  it("redirects to /login/verify-2fa when needs2fa is set", async () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin", needs2fa: true } }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login/verify-2fa")
  })

  it("redirects to /login/setup-2fa when needsSetup2fa is set", async () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin", needsSetup2fa: true } }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login/setup-2fa")
  })

  // ─── Admin-only settings ──────────────────────────────────

  it("redirects non-admin from /settings/roles to root", async () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "viewer" } }
    const req = makeReq({ pathname: "/settings/roles", auth: session })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toMatch(/\/$/)
  })

  it("allows admin to access /settings/security", async () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin" } }
    const req = makeReq({ pathname: "/settings/security", auth: session })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
  })

  // ─── Authenticated root redirect ─────────────────────────

  it("redirects authenticated '/' to /dashboard", async () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin" } }
    const req = makeReq({ pathname: "/", auth: session })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/dashboard")
  })

  // ─── Webhook rate-limiting ───────────────────────────────

  it("allows webhook POST when rate limit is under threshold", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true)
    const req = makeReq({
      pathname: "/api/v1/webhooks/telegram",
      method: "POST",
      auth: null,
      headers: { "x-real-ip": "1.2.3.4" },
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
  })

  it("returns 429 when webhook rate limit is exceeded", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const req = makeReq({
      pathname: "/api/v1/webhooks/telegram",
      method: "POST",
      auth: null,
      headers: { "x-real-ip": "9.9.9.9" },
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(429)
  })

  it("keys webhook rate-limit by namespace and IP", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true)
    const req = makeReq({
      pathname: "/api/v1/webhooks/whatsapp",
      method: "POST",
      auth: null,
      headers: { "x-real-ip": "1.2.3.4" },
    })
    await authMiddleware(req)
    // First arg is the composed rate-limit key
    const keyArg = vi.mocked(checkRateLimit).mock.calls[0]?.[0]
    expect(keyArg).toBe("webhook:whatsapp:1.2.3.4")
  })

  it("does not apply webhook rate-limit to /api/v1/webhooks/manage (user CRUD)", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(false) // would 429 if applied
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin" } }
    const req = makeReq({
      pathname: "/api/v1/webhooks/manage",
      method: "GET",
      auth: session,
    })
    const res = await authMiddleware(req)
    // Reaches authenticated branch, not the webhook 429
    expect(res.status).not.toBe(429)
  })

  it("rate-limits /api/v1/calls/webhook with namespace 'calls'", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true)
    const req = makeReq({
      pathname: "/api/v1/calls/webhook",
      method: "POST",
      auth: null,
      headers: { "x-real-ip": "5.5.5.5" },
    })
    await authMiddleware(req)
    const keyArg = vi.mocked(checkRateLimit).mock.calls[0]?.[0]
    expect(keyArg).toBe("webhook:calls:5.5.5.5")
  })

  it("rate-limits /api/v1/calendar/feed with namespace 'calendar'", async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true)
    const req = makeReq({
      pathname: "/api/v1/calendar/feed/abc123",
      method: "GET",
      auth: null,
      headers: { "x-real-ip": "6.6.6.6" },
    })
    await authMiddleware(req)
    const keyArg = vi.mocked(checkRateLimit).mock.calls[0]?.[0]
    expect(keyArg).toBe("webhook:calendar:6.6.6.6")
  })

  // ─── 429 structured logging ──────────────────────────────

  it("logs a [rate-limit-429] warning when auth POST rate-limit fires", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const req = makeReq({
      pathname: "/login",
      method: "POST",
      auth: null,
      headers: { "x-real-ip": "7.7.7.7" },
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(429)
    expect(warnSpy).toHaveBeenCalledWith(
      "[rate-limit-429] category=auth key=auth:7.7.7.7 path=/login",
    )
    warnSpy.mockRestore()
  })

  it("logs a [rate-limit-429] warning when webhook rate-limit fires", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const req = makeReq({
      pathname: "/api/v1/webhooks/telegram",
      method: "POST",
      auth: null,
      headers: { "x-real-ip": "8.8.8.8" },
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(429)
    expect(warnSpy).toHaveBeenCalledWith(
      "[rate-limit-429] category=webhook key=webhook:telegram:8.8.8.8 path=/api/v1/webhooks/telegram",
    )
    warnSpy.mockRestore()
  })

  it("does not log anything when rate-limit passes", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.mocked(checkRateLimit).mockReturnValue(true)
    const req = makeReq({
      pathname: "/login",
      method: "POST",
      auth: null,
      headers: { "x-real-ip": "9.9.9.9" },
    })
    await authMiddleware(req)
    const rlLogs = warnSpy.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("[rate-limit-429]"),
    )
    expect(rlLogs).toHaveLength(0)
    warnSpy.mockRestore()
  })

  // ─── Cross-tenant binding ─────────────────────────────────
  //
  // Session cookie is shared across *.leaddrivecrm.org (COOKIE_DOMAIN).
  // Middleware must not let a user whose session is for tenant X operate
  // on tenant Y's subdomain — redirect to /login?error=cross-tenant and
  // clear the shared cookie.

  it("redirects to /login?error=cross-tenant when session org differs from subdomain slug", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const session = {
      user: {
        id: "u1",
        organizationId: "org-leaddrive",
        organizationSlug: "leaddrive",
        role: "admin",
      },
    }
    const req = makeReq({
      pathname: "/dashboard",
      host: "afigroup.leaddrivecrm.org",
      auth: session,
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    const location = res.headers.get("location") || ""
    expect(location).toContain("/login")
    expect(location).toContain("error=cross-tenant")
    // Redirect should stay on the tenant subdomain (host), not bounce to app.
    expect(location).toContain("afigroup.leaddrivecrm.org")
    // Session cookie must be cleared so the user lands on /login fresh.
    const setCookie = res.headers.get("set-cookie") || ""
    expect(setCookie).toMatch(/authjs\.session-token=;/)
    // Structured warn for ops visibility.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[cross-tenant-block\] session-slug=leaddrive host-slug=afigroup/),
    )
    warnSpy.mockRestore()
  })

  it("allows access when session org slug matches subdomain slug", async () => {
    const session = {
      user: {
        id: "u1",
        organizationId: "org-afi",
        organizationSlug: "afigroup",
        role: "admin",
      },
    }
    const req = makeReq({
      pathname: "/dashboard",
      host: "afigroup.leaddrivecrm.org",
      auth: session,
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("x-tenant-slug")).toBe("afigroup")
    expect(res.headers.get("x-organization-id")).toBe("org-afi")
  })

  it("lets superadmin pass through on any tenant subdomain (bypass)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const session = {
      user: {
        id: "u1",
        organizationId: "org-leaddrive",
        organizationSlug: "leaddrive",
        role: "superadmin",
      },
    }
    const req = makeReq({
      pathname: "/dashboard",
      host: "afigroup.leaddrivecrm.org",
      auth: session,
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
    // No cross-tenant warning should fire for superadmin.
    const crossTenantLogs = warnSpy.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("[cross-tenant-block]"),
    )
    expect(crossTenantLogs).toHaveLength(0)
    warnSpy.mockRestore()
  })

  it("blocks when session has no organizationSlug at all (old token)", async () => {
    // JWTs issued before the organizationSlug field existed lack the slug.
    // These must fail closed on tenant subdomains — safer to force re-login
    // than to risk cross-tenant leakage.
    const session = {
      user: { id: "u1", organizationId: "org-leaddrive", role: "admin" },
    }
    const req = makeReq({
      pathname: "/dashboard",
      host: "zeytunpharm.leaddrivecrm.org",
      auth: session,
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("error=cross-tenant")
  })

  it("does not run cross-tenant check on the app subdomain", async () => {
    const session = {
      user: {
        id: "u1",
        organizationId: "org-leaddrive",
        organizationSlug: "leaddrive",
        role: "admin",
      },
    }
    const req = makeReq({
      pathname: "/dashboard",
      host: "app.leaddrivecrm.org",
      auth: session,
    })
    const res = await authMiddleware(req)
    // app.* is reserved — getOrgSubdomain returns null, no tenant binding check.
    expect(res.status).toBe(200)
  })

  it("does not run cross-tenant check on public paths (/login)", async () => {
    // User lands on tenant subdomain /login with a stale cross-tenant cookie.
    // /login itself must not redirect (else infinite loop). The cross-tenant
    // check only runs on authenticated paths.
    const session = {
      user: {
        id: "u1",
        organizationId: "org-leaddrive",
        organizationSlug: "leaddrive",
        role: "admin",
      },
    }
    const req = makeReq({
      pathname: "/login",
      host: "afigroup.leaddrivecrm.org",
      auth: session,
    })
    const res = await authMiddleware(req)
    expect(res.status).toBe(200)
  })
})
