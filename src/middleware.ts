import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-ancestors 'none'",
  ].join("; ")
}

export function middleware(req: NextRequest) {
  const nonce = crypto.randomUUID()
  const response = NextResponse.next({
    headers: new Headers(req.headers),
  })

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
