import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { canAccessModule } from "@/lib/plan-config"

const publicPaths = ["/login", "/register", "/forgot-password", "/api/auth", "/portal", "/home", "/pricing", "/features", "/demo", "/about", "/contact", "/blog", "/legal", "/landing", "/marketing"]

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow health check
  if (pathname === "/api/health") {
    return NextResponse.next()
  }

  // Allow public event registration pages
  if (/^\/events\/[^/]+\/register/.test(pathname)) {
    return NextResponse.next()
  }

  // Allow public API (web-to-lead, calendar feed, journey processor, webhooks)
  if (pathname.startsWith("/api/v1/public/") || pathname.startsWith("/api/v1/calendar/feed/") || pathname === "/api/v1/journeys/process" || pathname.startsWith("/api/v1/webhooks/")) {
    return NextResponse.next()
  }

  // Check authentication — unauthenticated root "/" goes to marketing homepage
  if (!req.auth) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/home", req.url))
    }
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2FA enforcement
  const session = req.auth as any
  const twoFaAllowedPaths = ["/login/verify-2fa", "/login/setup-2fa"]
  const twoFaAllowedApi = ["/api/v1/auth/verify-2fa", "/api/v1/auth/2fa", "/api/auth"]

  // If user has TOTP enabled — must verify code
  if (session?.user?.needs2fa === true) {
    if (twoFaAllowedPaths.includes(pathname) || twoFaAllowedApi.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL("/login/verify-2fa", req.url))
  }

  // If admin required 2FA but user hasn't set it up yet — force setup
  if (session?.user?.needsSetup2fa === true) {
    if (twoFaAllowedPaths.includes(pathname) || twoFaAllowedApi.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL("/login/setup-2fa", req.url))
  }

  // Inject organization context into headers for server components
  const headers = new Headers(req.headers)
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

  // Admin-only routes
  if (pathname.startsWith("/settings") && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Plan-based feature gating — redirect to billing page if module not available
  const plan = (session?.user as any)?.plan || "enterprise"
  if (!canAccessModule(plan, pathname)) {
    const billingUrl = new URL("/settings/billing", req.url)
    billingUrl.searchParams.set("upgrade", "true")
    return NextResponse.redirect(billingUrl)
  }

  return NextResponse.next({ headers })
}) as unknown as (req: NextRequest) => NextResponse

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
