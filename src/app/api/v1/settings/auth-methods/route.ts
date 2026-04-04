import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"

// GET — public endpoint (login page needs this without auth)
// Returns which OAuth methods are enabled
export async function GET(req: NextRequest) {
  // Check if env vars are configured
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  const microsoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)

  // Try to get org settings for admin-level toggle
  // If user is authenticated, use their org; otherwise check if orgId is in query
  const orgId = await getOrgId(req).catch(() => null)

  let googleEnabled = true
  let microsoftEnabled = true

  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId as string },
      select: { settings: true },
    })
    const settings = (org?.settings as any) || {}
    const authMethods = settings.authMethods || {}
    if (authMethods.google === false) googleEnabled = false
    if (authMethods.microsoft === false) microsoftEnabled = false
  }

  return NextResponse.json({
    success: true,
    data: {
      google: googleConfigured && googleEnabled,
      microsoft: microsoftConfigured && microsoftEnabled,
    },
  })
}

// PUT — admin only, toggle auth methods
export async function PUT(req: NextRequest) {
  const authResult = await requireAuth(req, "settings", "write")
  if (isAuthError(authResult)) return authResult

  const { google, microsoft } = await req.json()

  const org = await prisma.organization.findUnique({
    where: { id: authResult.orgId },
    select: { settings: true },
  })

  const currentSettings = (org?.settings as any) || {}
  currentSettings.authMethods = {
    google: google !== false, // default true
    microsoft: microsoft !== false, // default true
  }

  await prisma.organization.update({
    where: { id: authResult.orgId },
    data: { settings: currentSettings },
  })

  return NextResponse.json({ success: true, data: currentSettings.authMethods })
}
