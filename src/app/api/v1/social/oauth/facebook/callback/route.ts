import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { encryptToken } from "@/lib/secure-token"

const GRAPH = "https://graph.facebook.com/v21.0"

interface TokenJson { access_token: string; token_type?: string; expires_in?: number }
interface Page {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string }
}

/**
 * Build an absolute URL that points to the *public* host (app.leaddrivecrm.org),
 * not the internal upstream (0.0.0.0:3001) that req.url exposes behind nginx.
 */
function publicUrl(req: NextRequest, path: string): URL {
  const proto = req.headers.get("x-forwarded-proto") || "https"
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "app.leaddrivecrm.org"
  return new URL(path, `${proto}://${host}`)
}

/**
 * Facebook (Meta Graph) OAuth callback.
 *
 * Flow:
 *  1. Verify state cookie (multi-tenant orgId + CSRF guard).
 *  2. Exchange `code` for a short-lived user access token.
 *  3. Exchange short-lived for a long-lived user token (~60 days).
 *  4. GET /me/accounts — returns every Page the user admins, each with its
 *     own long-lived Page access token (these don't expire as long as the
 *     user keeps admin access).
 *  5. Upsert one SocialAccount per Page. If the Page has a linked Instagram
 *     Business account, also upsert a SocialAccount for `instagram`.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  if (!code || !state) return redirectError(req, "missing_code")

  const cookieVal = req.cookies.get("ld_fb_oauth")?.value
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
  const payload = JSON.parse(payloadStr) as { orgId: string; state: string; ts: number }
  if (payload.state !== state) return redirectError(req, "state_mismatch")
  if (Date.now() - payload.ts > 10 * 60 * 1000) return redirectError(req, "expired")

  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI
  if (!appId || !appSecret || !redirectUri) return redirectError(req, "not_configured")

  // 1) short-lived user token
  const shortRes = await fetch(
    `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`,
  )
  if (!shortRes.ok) {
    console.error("[facebook-oauth] short token failed:", await shortRes.text())
    return redirectError(req, "token_exchange_failed")
  }
  const shortJson = await shortRes.json() as TokenJson

  // 2) long-lived user token (~60 days)
  const longRes = await fetch(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(shortJson.access_token)}`,
  )
  if (!longRes.ok) {
    console.error("[facebook-oauth] long token failed:", await longRes.text())
    return redirectError(req, "long_token_failed")
  }
  const longJson = await longRes.json() as TokenJson

  // 3) list admined pages (each comes with its own long-lived page token)
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(longJson.access_token)}`,
  )
  if (!pagesRes.ok) {
    console.error("[facebook-oauth] /me/accounts failed:", await pagesRes.text())
    return redirectError(req, "pages_fetch_failed")
  }
  const pagesJson = await pagesRes.json() as { data: Array<Page & { instagram_business_account?: { id: string; username?: string } }> }
  const pages = pagesJson.data || []
  if (pages.length === 0) {
    return NextResponse.redirect(publicUrl(req, "/social-monitoring?error=no_admined_pages"))
  }

  let fbCount = 0
  let igCount = 0

  for (const page of pages) {
    const encryptedPageToken = encryptToken(page.access_token, `oauth:facebook:${page.id}`)

    await prisma.socialAccount.upsert({
      where: {
        organizationId_platform_handle: {
          organizationId: payload.orgId,
          platform: "facebook",
          handle: page.id,
        },
      },
      update: {
        accessToken: encryptedPageToken,
        displayName: page.name,
        isActive: true,
      },
      create: {
        organizationId: payload.orgId,
        platform: "facebook",
        handle: page.id,
        displayName: page.name,
        accessToken: encryptedPageToken,
        isActive: true,
      },
    })
    fbCount++

    const ig = page.instagram_business_account
    if (ig) {
      // Instagram reuses the Page access token for Graph API calls.
      const encryptedIg = encryptToken(page.access_token, `oauth:instagram:${ig.id}`)
      const igHandle = (ig as { username?: string }).username || ig.id
      await prisma.socialAccount.upsert({
        where: {
          organizationId_platform_handle: {
            organizationId: payload.orgId,
            platform: "instagram",
            handle: ig.id,
          },
        },
        update: {
          accessToken: encryptedIg,
          displayName: `${page.name} / @${igHandle}`,
          isActive: true,
        },
        create: {
          organizationId: payload.orgId,
          platform: "instagram",
          handle: ig.id,
          displayName: `${page.name} / @${igHandle}`,
          accessToken: encryptedIg,
          isActive: true,
        },
      })
      igCount++
    }
  }

  const res = NextResponse.redirect(
    publicUrl(req, `/social-monitoring?connected=facebook&pages=${fbCount}&ig=${igCount}`),
  )
  res.cookies.delete("ld_fb_oauth")
  return res
}

function redirectError(req: NextRequest, code: string): NextResponse {
  return NextResponse.redirect(publicUrl(req, `/social-monitoring?error=${code}`))
}
