import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { requireAuth, isAuthError } from "@/lib/api-auth"

/**
 * Start Twitter/X OAuth 2.0 Authorization Code flow with PKCE.
 * Requires env vars: TWITTER_CLIENT_ID, TWITTER_REDIRECT_URI.
 * Saves state + verifier server-side-signed in a short-lived cookie.
 */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "settings", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const clientId = process.env.TWITTER_CLIENT_ID
  const redirectUri = process.env.TWITTER_REDIRECT_URI
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Twitter OAuth is not configured. Set TWITTER_CLIENT_ID and TWITTER_REDIRECT_URI." },
      { status: 500 },
    )
  }

  const verifier = base64url(crypto.randomBytes(32))
  const challenge = base64url(crypto.createHash("sha256").update(verifier).digest())
  const state = base64url(crypto.randomBytes(16))

  const payload = JSON.stringify({ orgId, state, verifier, ts: Date.now() })
  const secret = process.env.NEXTAUTH_SECRET || "ld-social-oauth"
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  const url = new URL("https://twitter.com/i/oauth2/authorize")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", "tweet.read users.read offline.access")
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", challenge)
  url.searchParams.set("code_challenge_method", "S256")

  const cookieValue = Buffer.from(payload + "." + sig).toString("base64url")
  const res = NextResponse.redirect(url.toString())
  res.cookies.set("ld_tw_oauth", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 min
    path: "/",
  })
  return res
}
