import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { requireAuth, isAuthError } from "@/lib/api-auth"

/**
 * Start Facebook (Meta Graph) OAuth flow. The same token covers Instagram
 * Business/Creator accounts linked to the page, so one flow serves both.
 *
 * Required env:
 *   FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_REDIRECT_URI
 *
 * Multi-tenant: orgId + state travel in a signed cookie; the single redirect
 * URI in the Meta App dashboard is shared by every tenant.
 */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "settings", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const appId = process.env.FACEBOOK_APP_ID
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI
  if (!appId || !redirectUri) {
    return NextResponse.json(
      { error: "Facebook OAuth is not configured. Set FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_REDIRECT_URI." },
      { status: 500 },
    )
  }

  const state = base64url(crypto.randomBytes(16))
  const payload = JSON.stringify({ orgId, state, ts: Date.now() })
  const secret = process.env.NEXTAUTH_SECRET || "ld-social-oauth"
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  // Scopes must be enabled in the Meta App's Use Cases > Permissions tab first.
  // Kept minimal: enough to list admined pages, read their feed, and reach the
  // linked Instagram Business account. Messaging/publishing scopes can be added
  // later per-use-case if we grow replying/posting features.
  const scopes = [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "business_management",
    "instagram_basic",
  ].join(",")

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth")
  url.searchParams.set("client_id", appId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  url.searchParams.set("scope", scopes)
  url.searchParams.set("response_type", "code")

  const cookieValue = Buffer.from(payload + "." + sig).toString("base64url")
  const res = NextResponse.redirect(url.toString())
  res.cookies.set("ld_fb_oauth", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  })
  return res
}
