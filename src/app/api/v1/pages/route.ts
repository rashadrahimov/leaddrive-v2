import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

const createPageSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""

  try {
    const where: any = {
      organizationId: orgId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    }

    const pages = await prisma.landingPage.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        publishedAt: true,
        totalViews: true,
        totalSubmissions: true,
        metaTitle: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ success: true, data: pages })
  } catch (e: any) {
    console.error("[PAGES] GET error:", e?.message)
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createPageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { name, slug, description } = parsed.data

    // Check slug uniqueness within org
    const existing = await prisma.landingPage.findUnique({
      where: { organizationId_slug: { organizationId: session.orgId, slug } },
    })
    if (existing) {
      return NextResponse.json({ error: "Slug already in use" }, { status: 409 })
    }

    const page = await prisma.landingPage.create({
      data: {
        organizationId: session.orgId,
        name,
        slug,
        description,
        createdBy: session.userId,
      },
    })

    return NextResponse.json({ success: true, data: page }, { status: 201 })
  } catch (e: any) {
    console.error("[PAGES] POST error:", e?.message)
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 })
  }
}
