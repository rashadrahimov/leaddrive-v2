import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const APP_HOST = "app.leaddrivecrm.org"
const MARKETING_HOST = "leaddrivecrm.org"

const CRM_PATHS = ["/login", "/register", "/dashboard", "/settings", "/portal", "/forgot-password", "/reset-password", "/admin"]
const MARKETING_PATHS = ["/home", "/plans", "/demo", "/contact", "/about", "/legal", "/landing"]

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://leaddrivecrm.org https://api.anthropic.com",
    "frame-ancestors 'none'",
  ].join("; ")
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.replace(/:\d+$/, "") || ""
  const pathname = req.nextUrl.pathname

  // Marketing domain: redirect CRM routes to app subdomain
  if (host === MARKETING_HOST || host === `www.${MARKETING_HOST}`) {
    if (CRM_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.redirect(
        new URL(`https://${APP_HOST}${pathname}${req.nextUrl.search}`, req.url)
      )
    }
  }

  // App domain: redirect marketing routes to main domain
  if (host === APP_HOST) {
    if (MARKETING_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.redirect(
        new URL(`https://${MARKETING_HOST}${pathname}${req.nextUrl.search}`, req.url)
      )
    }
  }

  // Security headers
  const nonce = crypto.randomUUID()
  const response = NextResponse.next()

  response.headers.set("x-nonce", nonce)
  response.headers.set("Content-Security-Policy", buildCsp(nonce))
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.well-known).*)"],
}
