import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { canAccessModule } from "@/lib/plan-config"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"

const publicPaths = ["/login", "/register", "/forgot-password", "/api/auth", "/api/v1/auth/register", "/portal", "/home", "/pricing", "/plans", "/features", "/demo", "/about", "/contact", "/blog", "/legal", "/landing", "/marketing"]

// Paths that should be rate-limited more aggressively
const RATE_LIMITED_PATHS = ["/api/auth", "/login", "/register", "/forgot-password", "/api/v1/auth/reset-password", "/api/v1/auth/2fa", "/api/v1/auth/totp", "/api/v1/auth/verify-2fa"]

// Generate CSP header with nonce
function buildCsp(nonce: string, allowSameOriginFrame = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${process.env.NEXTAUTH_URL || "https://app.leaddrivecrm.org"} https://leaddrivecrm.org https://api.anthropic.com`,
    allowSameOriginFrame ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
  ].join("; ")
}

// Paths that are allowed to be embedded in same-origin iframes (e.g. invoice preview)
const IFRAME_ALLOWED_PATHS = ["/api/v1/invoices/"]

function isIframeAllowedPath(pathname: string): boolean {
  return IFRAME_ALLOWED_PATHS.some((p) => pathname.startsWith(p) && (pathname.includes("/pdf") || pathname.includes("/act")))
}

// Apply CSP + nonce headers to any response
function withCspHeaders(response: NextResponse, nonce: string, allowSameOriginFrame = false): NextResponse {
  response.headers.set("x-nonce", nonce)
  if (allowSameOriginFrame) {
    // Embeddable HTML (e.g. invoice preview): allow same-origin iframe, skip strict CSP
    // so inline <style> tags work without nonce (CSP3 ignores 'unsafe-inline' when nonce present)
    response.headers.set("X-Frame-Options", "SAMEORIGIN")
  } else {
    response.headers.set("Content-Security-Policy", buildCsp(nonce))
    response.headers.set("X-Frame-Options", "DENY")
  }
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  return response
}

const authMiddleware = auth((req) => {
  const { pathname } = req.nextUrl
  const nonce = crypto.randomUUID()

  // Rate limit auth-related endpoints
  if (RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p)) && req.method === "POST") {
    // Prefer x-real-ip (set by Nginx), fallback to last x-forwarded-for entry (closest proxy)
    const ip = req.headers.get("x-real-ip")?.trim()
      || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim()
      || "unknown"
    const key = `auth:${ip}`
    if (!checkRateLimit(key, RATE_LIMIT_CONFIG.public)) {
      return withCspHeaders(
        NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }),
        nonce,
      )
    }
  }

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-nonce", nonce)
    return withCspHeaders(NextResponse.next({ headers: requestHeaders }), nonce)
  }

  // Allow health check
  if (pathname === "/api/health") {
    return withCspHeaders(NextResponse.next(), nonce)
  }

  // Allow public event registration pages
  if (/^\/events\/[^/]+\/register/.test(pathname)) {
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-nonce", nonce)
    return withCspHeaders(NextResponse.next({ headers: requestHeaders }), nonce)
  }

  // Rate limit public API POST endpoints (these bypass auth but must not bypass rate limits)
  if (pathname.startsWith("/api/v1/public/") && req.method === "POST") {
    const ip = req.headers.get("x-real-ip")?.trim()
      || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim()
      || "unknown"

    // Stricter limit for AI chat (expensive)
    if (pathname.includes("/portal-chat")) {
      const key = `chat:${ip}`
      if (!checkRateLimit(key, RATE_LIMIT_CONFIG.ai)) {
        return withCspHeaders(
          NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }),
          nonce,
        )
      }
    } else {
      // General public endpoint limit (leads, events, demo-request, etc.)
      const key = `public:${ip}`
      if (!checkRateLimit(key, RATE_LIMIT_CONFIG.public)) {
        return withCspHeaders(
          NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }),
          nonce,
        )
      }
    }
  }

  // Rate limit public API GET endpoints (prevent enumeration)
  if (pathname.startsWith("/api/v1/public/") && req.method === "GET") {
    const ip = req.headers.get("x-real-ip")?.trim()
      || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim()
      || "unknown"
    const key = `pub-get:${ip}`
    if (!checkRateLimit(key, RATE_LIMIT_CONFIG.api)) {
      return withCspHeaders(
        NextResponse.json({ error: "Too many requests" }, { status: 429 }),
        nonce,
      )
    }
  }

  // Allow public API (web-to-lead, calendar feed, journey processor, webhooks)
  if (pathname.startsWith("/api/v1/public/") || pathname.startsWith("/api/v1/calendar/feed/") || pathname.startsWith("/api/v1/webhooks/") || pathname === "/api/v1/journeys/process") {
    return withCspHeaders(NextResponse.next(), nonce)
  }

  // Check authentication — unauthenticated users go to login
  if (!req.auth) {
    if (pathname === "/") {
      return withCspHeaders(NextResponse.redirect(new URL("/login", req.url)), nonce)
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return withCspHeaders(NextResponse.redirect(loginUrl), nonce)
  }

  // Inject organization context + nonce into headers for server components
  const session = req.auth as any
  const headers = new Headers(req.headers)
  headers.set("x-nonce", nonce)
  const orgId = session?.user?.organizationId
  const role = session?.user?.role
  const userId = session?.user?.id
  if (orgId) {
    headers.set("x-organization-id", String(orgId))
  }
  if (userId) {
    headers.set("x-user-id", String(userId))
  }
  if (role) {
    headers.set("x-user-role", String(role))
  }

  // Inject locale from cookie for i18n
  const localeCookie = req.cookies.get("NEXT_LOCALE")?.value
  if (localeCookie) {
    headers.set("x-locale", localeCookie)
  }

  // Admin-only settings routes (security-sensitive)
  const ADMIN_ONLY_SETTINGS = ["/settings/roles", "/settings/security", "/settings/billing"]
  if (ADMIN_ONLY_SETTINGS.some((p) => pathname === p || pathname.startsWith(p + "/")) && role !== "admin") {
    return withCspHeaders(NextResponse.redirect(new URL("/", req.url)), nonce)
  }

  // Plan-based feature gating — redirect to billing page if module not available
  const plan = (session?.user as any)?.plan || "starter"
  if (!canAccessModule(plan, pathname)) {
    const billingUrl = new URL("/settings/billing", req.url)
    billingUrl.searchParams.set("upgrade", "true")
    return withCspHeaders(NextResponse.redirect(billingUrl), nonce)
  }

  return withCspHeaders(NextResponse.next({ headers }), nonce, isIframeAllowedPath(pathname))
}) as unknown as (req: NextRequest) => NextResponse

export default authMiddleware

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
