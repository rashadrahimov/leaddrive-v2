import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: profileId } = await params

  const profile = await prisma.pricingProfile.findFirst({ where: { id: profileId, organizationId: orgId } })
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  try {
    const body = await req.json()
    const { categoryId } = body

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
    }

    const profileCategory = await prisma.pricingProfileCategory.create({
      data: {
        organizationId: orgId,
        profileId,
        categoryId,
        total: 0,
      },
      include: { category: true, services: true },
    })

    return NextResponse.json({ success: true, data: profileCategory }, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "This category already exists for this profile" }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || "Failed to add category" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: profileId } = await params

  const { searchParams } = new URL(req.url)
  const profileCategoryId = searchParams.get("profileCategoryId")

  if (!profileCategoryId) {
    return NextResponse.json({ error: "profileCategoryId is required" }, { status: 400 })
  }

  const pc = await prisma.pricingProfileCategory.findFirst({
    where: { id: profileCategoryId, profileId, organizationId: orgId },
  })
  if (!pc) return NextResponse.json({ error: "Profile category not found" }, { status: 404 })

  await prisma.pricingProfileCategory.delete({ where: { id: profileCategoryId } })
  return NextResponse.json({ success: true, data: { deleted: true } })
}
