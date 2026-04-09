import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        plan: true,
        maxUsers: true,
        maxContacts: true,
        name: true,
        addons: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        plan: org.plan,
        maxUsers: org.maxUsers,
        maxContacts: org.maxContacts,
        organizationName: org.name,
        addons: org.addons || [],
      },
    })
  } catch (e) {
    console.error("Organization plan GET error:", e)
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
