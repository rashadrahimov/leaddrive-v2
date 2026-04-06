import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// GET — list form submissions for all landing pages in the organization
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const pageId = searchParams.get("pageId")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const submissions = await prisma.formSubmission.findMany({
      where: {
        organizationId: orgId,
        ...(pageId ? { landingPageId: pageId } : {}),
      },
      include: {
        landingPage: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ success: true, data: submissions })
  } catch (e) {
    console.error("Pages submissions error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
