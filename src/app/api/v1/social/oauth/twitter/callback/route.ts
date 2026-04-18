import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { encryptToken } from "@/lib/secure-token"

/**
 * Twitter OAuth 2.0 callback.
 * Exchanges the code for an access token + refresh token and stores them on a SocialAccount.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  if (!code || !state) return redirectError(req, "missing_code")

  const cookieVal = req.cookies.get("ld_tw_oauth")?.value
  if (!cookieVal) return redirectError(req, "missing_cookie")

  const [payloadStr, sig] = Buffer.from(cookieVal, "base64url").toString("utf8").split(".")
  if (!payloadStr || !sig) return redirectError(req, "bad_cookie")
  const secret = process.env.NEXTAUTH_SECRET || "ld-social-oauth"
  const expectedSig = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex")
  const a = Buffer.from(expectedSig)
  const b = Buffer.from(sig)
  if (a.length !== b.length) return redirectError(req, "bad_signature")
  try {
    if (!crypto.timingSafeEqual(a, b)) return redirectError(req, "bad_signature")
  } catch {
    return redirectError(req, "bad_signature")
  }
  const payload = JSON.parse(payloadStr) as { orgId: string; state: string; verifier: string; ts: number }
  if (payload.state !== state) return redirectError(req, "state_mismatch")
  if (Date.now() - payload.ts > 10 * 60 * 1000) return redirectError(req, "expired")

  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET
  const redirectUri = process.env.TWITTER_REDIRECT_URI
  if (!clientId || !redirectUri) return redirectError(req, "not_configured")

  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(clientSecret ? { Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64") } : {}),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: payload.verifier,
    }).toString(),
  })
  if (!tokenRes.ok) {
    console.error("[twitter-oauth] token exchange failed:", await tokenRes.text())
    return redirectError(req, "token_exchange_failed")
  }
  const tokenJson = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    scope?: string
  }

  // Fetch the authenticated user to get handle
  const userRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })
  const userJson = await userRes.json().catch(() => null) as { data?: { id: string; username: string; name: string } } | null
  const handle = userJson?.data?.username || "twitter_user"
  const displayName = userJson?.data?.name || handle

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + tokenJson.expires_in * 1000)
    : null

  // Store encoded tokens (access + refresh separated by ::) — encrypted at rest
  const storedToken = encryptToken(
    [tokenJson.access_token, tokenJson.refresh_token || ""].join("::"),
    "oauth:twitter",
  )

  await prisma.socialAccount.upsert({
    where: {
      organizationId_platform_handle: {
        organizationId: payload.orgId,
        platform: "twitter",
        handle,
      },
    },
    update: {
      accessToken: storedToken,
      tokenExpiresAt: expiresAt,
      displayName,
      isActive: true,
    },
    create: {
      organizationId: payload.orgId,
      platform: "twitter",
      handle,
      displayName,
      accessToken: storedToken,
      tokenExpiresAt: expiresAt,
      isActive: true,
    },
  })

  const res = NextResponse.redirect(new URL("/social-monitoring?connected=twitter", req.url))
  res.cookies.delete("ld_tw_oauth")
  return res
}

function redirectError(req: NextRequest, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/social-monitoring?error=${code}`, req.url))
}
