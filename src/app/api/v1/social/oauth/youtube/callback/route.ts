import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { encryptToken } from "@/lib/secure-token"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  if (!code || !state) return errRedirect(req, "missing_code")

  const cookieVal = req.cookies.get("ld_yt_oauth")?.value
  if (!cookieVal) return errRedirect(req, "missing_cookie")
  const [payloadStr, sig] = Buffer.from(cookieVal, "base64url").toString("utf8").split(".")
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

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return errRedirect(req, "not_configured")

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  })
  if (!tokenRes.ok) return errRedirect(req, "token_exchange_failed")
  const t = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in?: number }

  // Fetch channel info
  const chanRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${t.access_token}` },
  })
  const chan = (await chanRes.json().catch(() => null)) as { items?: Array<{ id: string; snippet: { title: string; customUrl?: string } }> } | null
  const channel = chan?.items?.[0]
  // YouTube Data API requires a channel ID (UC...) for `allThreadsRelatedToChannelId`.
  // The vanity/customUrl is NOT accepted. Store the channel ID in `handle`,
  // keep the customUrl / title in `displayName`.
  const handle = channel?.id || "youtube_channel"
  const displayName = channel?.snippet.title || channel?.snippet.customUrl || handle

  const stored = encryptToken([t.access_token, t.refresh_token || ""].join("::"), "oauth:youtube")
  const expiresAt = t.expires_in ? new Date(Date.now() + t.expires_in * 1000) : null

  await prisma.socialAccount.upsert({
    where: { organizationId_platform_handle: { organizationId: payload.orgId, platform: "youtube", handle } },
    update: { accessToken: stored, tokenExpiresAt: expiresAt, displayName, isActive: true },
    create: {
      organizationId: payload.orgId,
      platform: "youtube",
      handle,
      displayName,
      accessToken: stored,
      tokenExpiresAt: expiresAt,
      isActive: true,
    },
  })

  const res = NextResponse.redirect(new URL("/social-monitoring?connected=youtube", req.url))
  res.cookies.delete("ld_yt_oauth")
  return res
}

function errRedirect(req: NextRequest, code: string): NextResponse {
  return NextResponse.redirect(new URL(`/social-monitoring?error=${code}`, req.url))
}
