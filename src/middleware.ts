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

  // Allow public API (web-to-lead)
  if (pathname.startsWith("/api/v1/public/")) {
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
  const token = req.auth as unknown as Record<string, unknown> | null
  if (token?.organizationId) {
    headers.set("x-organization-id", String(token.organizationId))
  }
  if (token?.role) {
    headers.set("x-user-role", String(token.role))
  }

  // Admin-only routes
  if (pathname.startsWith("/settings") && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next({ headers })
}) as unknown as (req: NextRequest) => NextResponse

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
