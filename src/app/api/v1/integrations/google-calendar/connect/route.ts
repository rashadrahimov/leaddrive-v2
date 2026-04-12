import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { auth } from "@/lib/auth"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/v1/integrations/google-calendar/callback`

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    state: session.user.id, // pass userId to callback
  })

  return NextResponse.json({ success: true, url: authUrl })
}
