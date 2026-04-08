import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError, getOrgId } from "@/lib/api-auth"

/**
 * GET /api/v1/settings/organization — load organization details
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        logo: true,
        slug: true,
        plan: true,
        maxUsers: true,
        maxContacts: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: org })
  } catch (e) {
    console.error("Organization settings GET error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * PUT /api/v1/settings/organization — update organization name & logo
 */
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, "settings", "write")
  if (isAuthError(auth)) return auth

  try {
    const body = await req.json()
    const { name, logo } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    const updated = await prisma.organization.update({
      where: { id: auth.orgId },
      data: {
        name: name.trim(),
        ...(logo !== undefined ? { logo } : {}),
      },
      select: {
        name: true,
        logo: true,
        slug: true,
        plan: true,
        maxUsers: true,
        maxContacts: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error("Organization settings PUT error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
