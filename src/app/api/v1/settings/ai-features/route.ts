import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

/**
 * GET /api/v1/settings/ai-features — list current features
 * PATCH /api/v1/settings/ai-features — add/remove a feature flag
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { features: true },
  })

  return NextResponse.json({
    data: { features: Array.isArray(org?.features) ? org.features : [] },
  })
}

export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { feature, action } = body as { feature: string; action: "add" | "remove" }

  if (!feature || !["add", "remove"].includes(action)) {
    return NextResponse.json({ error: "feature and action (add/remove) required" }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { features: true },
  })

  const current: string[] = Array.isArray(org?.features) ? (org.features as string[]) : []

  let updated: string[]
  if (action === "add") {
    updated = current.includes(feature) ? current : [...current, feature]
  } else {
    updated = current.filter(f => f !== feature)
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { features: updated },
  })

  return NextResponse.json({ data: { features: updated } })
}
