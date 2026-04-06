import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const page = await prisma.landingPage.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })

    let body: { unpublish?: boolean } = {}
    try {
      body = await req.json()
    } catch {
      // empty body is fine — means publish
    }

    if (body.unpublish) {
      const updated = await prisma.landingPage.update({
        where: { id },
        data: { status: "draft" },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    const updated = await prisma.landingPage.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error("[PAGES] publish error:", e?.message)
    return NextResponse.json({ error: "Failed to update page status" }, { status: 500 })
  }
}
