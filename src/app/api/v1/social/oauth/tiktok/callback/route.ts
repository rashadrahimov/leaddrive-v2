import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { encryptToken } from "@/lib/secure-token"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  if (!code || !state) return errRedirect(req, "missing_code")

  const cookieVal = req.cookies.get("ld_tt_oauth")?.value
  if (!cookieVal) return errRedirect(req, "missing_cookie")
  const [payloadStr, sig] = Buffer.from(cookieVal, "base64url").toString("utf8").split(".")
  if (!payloadStr || !sig) return errRedirect(req, "bad_cookie")
  const secret = process.env.NEXTAUTH_SECRET || "ld-social-oauth"
  const expected = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(sig)
  if (a.length !== b.length) return errRedirect(req, "bad_signature")
  try {
    if (!crypto.timingSafeEqual(a, b)) return errRedirect(req, "bad_signature")
  } catch {
    return errRedirect(req, "bad_signature")
  }
  const payload = JSON.parse(payloadStr) as { orgId: string; state: string; ts: number }
  if (payload.state !== state) return errRedirect(req, "state_mismatch")

  const clientKey = process.env.TIKTOK_CLIENT_KEY
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET
  const redirectUri = process.env.TIKTOK_REDIRECT_URI
  if (!clientKey || !clientSecret || !redirectUri) return errRedirect(req, "not_configured")

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }).toString(),
  })
  if (!tokenRes.ok) return errRedirect(req, "token_exchange_failed")
  const tokenJson = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    open_id?: string
  }

  // Fetch user info
  const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name,avatar_url", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })
  const userJson = (await userRes.json().catch(() => null)) as { data?: { user?: { username?: string; display_name?: string } } } | null
  const handle = userJson?.data?.user?.username || tokenJson.open_id || "tiktok_user"
  const displayName = userJson?.data?.user?.display_name || handle

  const stored = encryptToken(
    [tokenJson.access_token, tokenJson.refresh_token || ""].join("::"),
    "oauth:tiktok",
  )
  const expiresAt = tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : null

  await prisma.socialAccount.upsert({
    where: {
      organizationId_platform_handle: { organizationId: payload.orgId, platform: "tiktok", handle },
    },
    update: { accessToken: stored, tokenExpiresAt: expiresAt, displayName, isActive: true },
    create: {
      organizationId: payload.orgId,
      platform: "tiktok",
      handle,
      displayName,
      accessToken: stored,
      tokenExpiresAt: expiresAt,
      isActive: true,
    },
  })

  const res = NextResponse.redirect(new URL("/social-monitoring?connected=tiktok", req.url))
  res.cookies.delete("ld_tt_oauth")
  return res
}

function errRedirect(req: NextRequest, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/social-monitoring?error=${code}`, req.url))
}
