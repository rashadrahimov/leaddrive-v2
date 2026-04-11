import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/v1/public/tenant-branding?slug=acme
// Public endpoint: returns org name, branding, logo for login page
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ data: null })
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      logo: true,
      branding: true,
      isActive: true,
    },
  })

  if (!org) {
    return NextResponse.json({ data: null })
  }

  if (!org.isActive) {
    return NextResponse.json({
      data: { name: org.name, suspended: true },
    })
  }

  return NextResponse.json({
    data: {
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      branding: org.branding,
      suspended: false,
    },
  })
}
