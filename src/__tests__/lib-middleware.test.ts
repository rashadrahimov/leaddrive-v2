import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock rate-limit before importing middleware
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => true),
  RATE_LIMIT_CONFIG: {
    api: { maxRequests: 100, windowMs: 60000 },
    ai: { maxRequests: 20, windowMs: 60000 },
    public: { maxRequests: 10, windowMs: 60000 },
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

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: rate limit allows
    vi.mocked(checkRateLimit).mockReturnValue(true)
    // Reset env so CRM_ONLY_MODE is effectively true for localhost tests
    process.env.NEXT_PUBLIC_MARKETING_URL = "https://leaddrivecrm.org"
    process.env.NEXT_PUBLIC_APP_URL = "https://app.leaddrivecrm.org"
  })

  // ─── Auth redirect ────────────────────────────────────────

  it("redirects unauthenticated users from /dashboard to /login", () => {
    const req = makeReq({ pathname: "/dashboard", auth: null })
    const res = authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login")
    expect(res.headers.get("location")).toContain("callbackUrl=%2Fdashboard")
  })

  it("redirects unauthenticated root '/' to /login", () => {
    const req = makeReq({ pathname: "/", auth: null })
    const res = authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login")
  })

  // ─── Public paths ─────────────────────────────────────────

  it("allows /login without authentication", () => {
    const req = makeReq({ pathname: "/login", auth: null })
    const res = authMiddleware(req)
    // Should pass through (200), not redirect
    expect(res.status).toBe(200)
  })

  it("allows /portal paths without authentication", () => {
    const req = makeReq({ pathname: "/portal/tickets", auth: null })
    const res = authMiddleware(req)
    expect(res.status).toBe(200)
  })

  it("allows /api/health without authentication", () => {
    const req = makeReq({ pathname: "/api/health", auth: null })
    const res = authMiddleware(req)
    expect(res.status).toBe(200)
  })

  // ─── Header injection ─────────────────────────────────────

  it("injects x-organization-id, x-user-id, x-user-role for authenticated users", () => {
    const session = {
      user: { id: "u1", organizationId: "org-42", role: "admin" },
    }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = authMiddleware(req)
    expect(res.status).toBe(200)
    // Headers are set on the request headers forwarded via NextResponse.next({ headers })
    expect(res.headers.get("x-organization-id")).toBe("org-42")
    expect(res.headers.get("x-user-id")).toBe("u1")
    expect(res.headers.get("x-user-role")).toBe("admin")
  })

  it("injects x-nonce header", () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "viewer" } }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = authMiddleware(req)
    expect(res.headers.get("x-nonce")).toBeTruthy()
  })

  // ─── Rate limiting ────────────────────────────────────────

  it("returns 429 when auth rate limit is exceeded on POST /login", () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const req = makeReq({ pathname: "/login", method: "POST", auth: null })
    const res = authMiddleware(req)
    expect(res.status).toBe(429)
  })

  it("does not rate-limit GET requests on auth paths", () => {
    vi.mocked(checkRateLimit).mockReturnValue(false)
    const req = makeReq({ pathname: "/login", method: "GET", auth: null })
    const res = authMiddleware(req)
    // GET on /login is a public path, should pass through (200)
    expect(res.status).toBe(200)
  })

  // ─── 2FA enforcement ──────────────────────────────────────

  it("redirects to /login/verify-2fa when needs2fa is set", () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin", needs2fa: true } }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login/verify-2fa")
  })

  it("redirects to /login/setup-2fa when needsSetup2fa is set", () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin", needsSetup2fa: true } }
    const req = makeReq({ pathname: "/dashboard", auth: session })
    const res = authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/login/setup-2fa")
  })

  // ─── Admin-only settings ──────────────────────────────────

  it("redirects non-admin from /settings/roles to root", () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "viewer" } }
    const req = makeReq({ pathname: "/settings/roles", auth: session })
    const res = authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toMatch(/\/$/)
  })

  it("allows admin to access /settings/security", () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin" } }
    const req = makeReq({ pathname: "/settings/security", auth: session })
    const res = authMiddleware(req)
    expect(res.status).toBe(200)
  })

  // ─── Authenticated root redirect ─────────────────────────

  it("redirects authenticated '/' to /dashboard", () => {
    const session = { user: { id: "u1", organizationId: "org-1", role: "admin" } }
    const req = makeReq({ pathname: "/", auth: session })
    const res = authMiddleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/dashboard")
  })
})
