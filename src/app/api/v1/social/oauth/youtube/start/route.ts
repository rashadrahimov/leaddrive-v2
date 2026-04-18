import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { requireAuth, isAuthError } from "@/lib/api-auth"

/**
 * YouTube / Google OAuth 2.0 start.
 * Requires env: GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI (YouTube variant),
 * scopes: https://www.googleapis.com/auth/youtube.readonly.
 */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "settings", "write")
  if (isAuthError(auth)) return auth

  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "YouTube OAuth not configured. Set GOOGLE_CLIENT_ID and YOUTUBE_REDIRECT_URI." },
      { status: 500 },
    )
  }

  const state = base64url(crypto.randomBytes(16))
  const payload = JSON.stringify({ orgId: auth.orgId, state, ts: Date.now() })
  const secret = process.env.NEXTAUTH_SECRET || "ld-social-oauth"
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly")
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("state", state)

  const cookieValue = Buffer.from(payload + "." + sig).toString("base64url")
  const res = NextResponse.redirect(url.toString())
  res.cookies.set("ld_yt_oauth", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })
  return res
}
