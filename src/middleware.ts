import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

const publicPaths = ["/login", "/register", "/forgot-password", "/api/auth", "/portal"]

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

  // Allow public API (web-to-lead, calendar feed, journey processor)
  if (pathname.startsWith("/api/v1/public/") || pathname.startsWith("/api/v1/calendar/feed/") || pathname === "/api/v1/journeys/process") {
    return NextResponse.next()
  }

  // Check authentication
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Inject organization context into headers for server components
  const headers = new Headers(req.headers)
  const session = req.auth as any
  const orgId = session?.user?.organizationId
  const role = session?.user?.role
  if (orgId) {
    headers.set("x-organization-id", String(orgId))
  }
  if (role) {
    headers.set("x-user-role", String(role))
  }

  // Admin-only routes
  if (pathname.startsWith("/settings") && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next({ headers })
}) as unknown as (req: NextRequest) => NextResponse

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
