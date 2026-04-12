import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const userId = searchParams.get("state")
  const error = searchParams.get("error")

  const appUrl = process.env.NEXTAUTH_URL || "https://app.leaddrivecrm.org"

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?gcal=error&reason=${error}`)
  }

  if (!code || !userId) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?gcal=error&reason=missing_params`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?gcal=error&reason=not_configured`)
  }

  const redirectUri = `${appUrl}/api/v1/integrations/google-calendar/callback`
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  try {
    const { tokens } = await oauth2Client.getToken(code)

    // Upsert: update existing or create new Account record for google-calendar
    const existing = await prisma.account.findFirst({
      where: { userId, provider: "google-calendar" },
    })

    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existing.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
          token_type: tokens.token_type || "Bearer",
          scope: tokens.scope || "https://www.googleapis.com/auth/calendar.events",
        },
      })
    } else {
      await prisma.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "google-calendar",
          providerAccountId: `gcal-${userId}`,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null,
          token_type: tokens.token_type || "Bearer",
          scope: tokens.scope || "https://www.googleapis.com/auth/calendar.events",
        },
      })
    }

    return NextResponse.redirect(`${appUrl}/settings/integrations?gcal=success`)
  } catch (err) {
    console.error("[Google Calendar] OAuth callback error:", err)
    return NextResponse.redirect(`${appUrl}/settings/integrations?gcal=error&reason=token_exchange`)
  }
}
