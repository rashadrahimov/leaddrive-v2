import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
// Plan gating disabled — import kept for reference
// import { canAccessModule } from "@/lib/plan-config"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"

const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/api/auth", "/api/v1/auth/register", "/api/v1/settings/auth-methods", "/portal", "/home", "/pricing", "/plans", "/features", "/demo", "/about", "/contact", "/blog", "/legal", "/landing", "/marketing", "/p", "/_custom-domain"]

// Marketing-only paths served on leaddrivecrm.org
const marketingPaths = ["/home", "/pricing", "/plans", "/features", "/demo", "/about", "/contact", "/blog", "/legal", "/landing", "/marketing"]

// Hostnames for domain-based routing (from env or defaults)
function getMarketingHosts(): string[] {
  const url = process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"
  const host = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  return [host, `www.${host}`]
}
function getAppHosts(): string[] {
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://app.leaddrivecrm.org"
  const host = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  return [host, `www.${host}`]
}
const MARKETING_HOSTS = getMarketingHosts()
const APP_HOSTS = getAppHosts()
// When app and marketing share the same domain, disable marketing routing (CRM-only mode)
const CRM_ONLY_MODE = MARKETING_HOSTS[0] === APP_HOSTS[0]

function isMarketingHost(host: string): boolean {
  return MARKETING_HOSTS.includes(host)
}

function isAppHost(host: string): boolean {
  return APP_HOSTS.includes(host)
}

function isMarketingPath(pathname: string): boolean {
  return marketingPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

// Tenant Builder: subdomain routing for {slug}.leaddrivecrm.org
const RESERVED_SUBDOMAINS = new Set(["app", "admin", "api", "www", "mail", "ftp", "static", "cdn", "assets", "status"])
function getOrgSubdomain(host: string): string | null {
  const baseDomain = (process.env.NEXT_PUBLIC_BASE_DOMAIN || "leaddrivecrm.org").replace(/^\./, "")
  const escaped = baseDomain.replace(/\./g, "\\.")
  const match = host.match(new RegExp(`^([a-z0-9][a-z0-9-]*)\\.${escaped}$`))
  if (!match) return null
  const sub = match[1]
  if (RESERVED_SUBDOMAINS.has(sub)) return null
  return sub
}

// Paths that should be rate-limited more aggressively
const RATE_LIMITED_PATHS = ["/api/auth", "/login", "/register", "/forgot-password", "/api/v1/auth/reset-password", "/api/v1/auth/2fa", "/api/v1/auth/totp", "/api/v1/auth/verify-2fa"]

// Generate CSP header with nonce
function buildCsp(nonce: string, allowSameOriginFrame = false) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://editor.unlayer.com https://*.unlayer.com`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://unpkg.com`,
    "img-src 'self' data: blob: https:",
    "media-src 'self'",
    "font-src 'self' data:",
    `connect-src 'self' ${process.env.NEXTAUTH_URL || "https://app.leaddrivecrm.org"} ${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"} https://api.anthropic.com https://accounts.google.com https://login.microsoftonline.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://tile.openstreetmap.de https://core-renderer-tiles.maps.yandex.net https://unpkg.com`,
    "form-action 'self' https://accounts.google.com https://login.microsoftonline.com",
    "frame-src 'self' https://editor.unlayer.com https://*.unlayer.com",
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
    // CSP disabled — was blocking map tiles and external resources
    // response.headers.set("Content-Security-Policy", buildCsp(nonce))
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
  const host = req.headers.get("host")?.replace(/:\d+$/, "") || ""

  // Tenant subdomain routing: {slug}.leaddrivecrm.org → treat as app host with tenant context
  const tenantSlug = getOrgSubdomain(host)
  const isTenantSubdomain = !!tenantSlug

  // Custom domain routing: if not a known host and not a tenant subdomain, rewrite to custom domain handler
  const isLocalhost = host === "localhost" || host.startsWith("127.") || host.includes("localhost:")
  if (!isMarketingHost(host) && !isAppHost(host) && !isTenantSubdomain && !isLocalhost && host) {
    // API paths and static assets should be handled normally
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/sw.js") {
      return withCspHeaders(NextResponse.next(), nonce)
    }

    // Rewrite to custom domain handler
    const url = req.nextUrl.clone()
    const slug = pathname === "/" ? "" : pathname.replace(/^\//, "")
    url.pathname = "/_custom-domain"
    url.searchParams.set("host", host)
    url.searchParams.set("slug", slug)

    const requestHeaders = new Headers(req.headers)
    requestHeaders.set("x-nonce", nonce)
    requestHeaders.set("x-custom-domain", host)

    return withCspHeaders(
      NextResponse.rewrite(url, { headers: requestHeaders }),
      nonce
    )
  }

  // Domain-based routing: leaddrivecrm.org serves marketing, app.leaddrivecrm.org serves CRM
  // In CRM_ONLY_MODE (same domain for app+marketing), skip marketing routing entirely
  if (!CRM_ONLY_MODE && isMarketingHost(host)) {
    // On marketing domain: "/" → /home
    if (pathname === "/") {
      return withCspHeaders(NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"}/home`)), nonce)
    }
    // On marketing domain: allow marketing paths + static assets + sw.js
    if (isMarketingPath(pathname) || pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/sw.js") {
      // Let it through — will be handled by publicPaths check below
    } else {
      // Non-marketing paths (dashboard, auth, etc.) → redirect to app subdomain
      const appUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL || "https://app.leaddrivecrm.org"}${pathname}`)
      appUrl.search = req.nextUrl.search
      return withCspHeaders(NextResponse.redirect(appUrl), nonce)
    }
  }

  if (!CRM_ONLY_MODE && isAppHost(host)) {
    // On app domain: marketing paths → redirect to marketing domain
    if (isMarketingPath(pathname)) {
      const marketingUrl = new URL(`${process.env.NEXT_PUBLIC_MARKETING_URL || "https://leaddrivecrm.org"}${pathname}`)
      marketingUrl.search = req.nextUrl.search
      return withCspHeaders(NextResponse.redirect(marketingUrl), nonce)
    }
  }

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
    if (tenantSlug) requestHeaders.set("x-tenant-slug", tenantSlug)
    // Inject locale for i18n on public/marketing pages
    const localeCookie = req.cookies.get("NEXT_LOCALE")?.value
    if (localeCookie) {
      requestHeaders.set("x-locale", localeCookie)
    }
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

  // Allow all MTM API (mobile JWT + session auth handled inside route handlers via getOrgId/requireAuth)
  if (pathname.startsWith("/api/v1/mtm/")) {
    return withCspHeaders(NextResponse.next(), nonce)
  }

  // Allow public API (web-to-lead, calendar feed, journey processor, webhooks)
  if (pathname.startsWith("/api/v1/public/") || pathname.startsWith("/api/v1/calendar/feed/") || pathname.startsWith("/api/v1/webhooks/") || pathname === "/api/v1/journeys/process" || pathname.startsWith("/api/v1/calls/webhook") || pathname.startsWith("/api/v1/calls/twiml") || pathname.startsWith("/api/cron/")) {
    return withCspHeaders(NextResponse.next(), nonce)
  }

  // Allow API key authenticated requests (Bearer ld_...) — auth checked in api-auth.ts
  if (pathname.startsWith("/api/") && req.headers.get("authorization")?.startsWith("Bearer ld_")) {
    return withCspHeaders(NextResponse.next(), nonce)
  }

  // Check authentication — unauthenticated users go to login
  if (!req.auth) {
    // For tenant subdomains, build redirect URL from Host header (not req.url which NextAuth
    // overrides with NEXTAUTH_URL). This keeps users on zeytunpharm.leaddrivecrm.org/login
    // instead of redirecting to app.leaddrivecrm.org/login.
    const proto = req.headers.get("x-forwarded-proto") || "https"
    const baseUrl = isTenantSubdomain ? `${proto}://${host}` : req.url

    if (pathname === "/") {
      return withCspHeaders(NextResponse.redirect(new URL("/login", baseUrl)), nonce)
    }
    const loginUrl = new URL("/login", baseUrl)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return withCspHeaders(NextResponse.redirect(loginUrl), nonce)
  }

  // 2FA enforcement — redirect to verify/setup if needed
  const session2fa = req.auth as any
  if (session2fa?.user?.needs2fa && !pathname.startsWith("/login/verify-2fa") && !pathname.startsWith("/api/")) {
    return withCspHeaders(NextResponse.redirect(new URL("/login/verify-2fa", req.url)), nonce)
  }
  if (session2fa?.user?.needsSetup2fa && !pathname.startsWith("/login/setup-2fa") && !pathname.startsWith("/api/")) {
    return withCspHeaders(NextResponse.redirect(new URL("/login/setup-2fa", req.url)), nonce)
  }

  // Redirect root to dashboard to avoid Next.js 16 standalone InvariantError on "/"
  if (pathname === "/") {
    return withCspHeaders(NextResponse.redirect(new URL("/dashboard", req.url)), nonce)
  }

  // Inject organization context + nonce into headers for server components
  const session = req.auth as any
  const headers = new Headers(req.headers)
  headers.set("x-nonce", nonce)
  if (tenantSlug) headers.set("x-tenant-slug", tenantSlug)
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
  if (ADMIN_ONLY_SETTINGS.some((p) => pathname === p || pathname.startsWith(p + "/")) && role !== "admin" && role !== "superadmin") {
    return withCspHeaders(NextResponse.redirect(new URL("/", req.url)), nonce)
  }

  // Plan-based feature gating — DISABLED (all routes accessible regardless of plan)

  return withCspHeaders(NextResponse.next({ headers }), nonce, isIframeAllowedPath(pathname))
}) as unknown as (req: NextRequest) => NextResponse

export default authMiddleware

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|wallpapers/|leaflet\\.css).*)"],
}
