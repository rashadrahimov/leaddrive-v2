import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await auth()
  const userId = (session?.user as any)?.id

  try {
    const layout = await prisma.dashboardLayout.findFirst({
      where: { organizationId: orgId, userId: userId || "" },
    })
    return NextResponse.json({
      success: true,
      data: layout?.layoutConfig || null,
    })
  } catch {
    return NextResponse.json({ success: true, data: null })
  }
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await auth()
  const userId = (session?.user as any)?.id || ""

  const body = await req.json()

  try {
    const existing = await prisma.dashboardLayout.findFirst({
      where: { organizationId: orgId, userId },
    })

    if (existing) {
      await prisma.dashboardLayout.update({
        where: { id: existing.id },
        data: { layoutConfig: body.layoutConfig },
      })
    } else {
      await prisma.dashboardLayout.create({
        data: {
          organizationId: orgId,
          userId,
          layoutConfig: body.layoutConfig,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
