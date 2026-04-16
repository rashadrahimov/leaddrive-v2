import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"

const DEFAULT_SETTINGS: Record<string, any> = {
  gpsInterval: 30, // seconds
  geofenceRadius: 100, // meters
  photoRequired: true,
  maxPhotosPerVisit: 10,
  autoCheckoutMinutes: 120,
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  alertGpsSpoofing: true,
  alertLateStart: true,
  alertMissedVisit: true,
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const settings = await prisma.mtmSetting.findMany({ where: { organizationId: orgId } })
    const result: Record<string, any> = { ...DEFAULT_SETTINGS }
    for (const s of settings) {
      result[s.key] = s.value
    }
    return NextResponse.json({ success: true, data: result })
  } catch {
    return NextResponse.json({ success: true, data: DEFAULT_SETTINGS })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const ALLOWED_ROLES = ["admin", "manager", "superadmin"]
  if (!ALLOWED_ROLES.includes(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const orgId = auth.orgId
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const updates = Object.entries(body).map(([key, value]) =>
      prisma.mtmSetting.upsert({
        where: { organizationId_key: { organizationId: orgId, key } },
        create: { organizationId: orgId, key, value: value as any },
        update: { value: value as any },
      })
    )
    await Promise.all(updates)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update settings" }, { status: 400 })
  }
}
