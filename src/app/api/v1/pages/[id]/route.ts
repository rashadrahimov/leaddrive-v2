import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

const updatePageSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().max(1000).optional().nullable(),
  gjsData: z.any().optional(),
  htmlContent: z.string().optional().nullable(),
  cssContent: z.string().optional().nullable(),
  formConfig: z.any().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().max(500).optional().nullable(),
})

export async function GET(
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

    return NextResponse.json({ success: true, data: page })
  } catch (e: any) {
    console.error("[PAGES] GET by id error:", e?.message)
    return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession(req)
  if (!session?.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const page = await prisma.landingPage.findFirst({
      where: { id, organizationId: session.orgId },
    })
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 })

    const body = await req.json()
    const parsed = updatePageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const data = parsed.data

    // If slug is being changed, check uniqueness
    if (data.slug && data.slug !== page.slug) {
      const existing = await prisma.landingPage.findUnique({
        where: { organizationId_slug: { organizationId: session.orgId, slug: data.slug } },
      })
      if (existing) {
        return NextResponse.json({ error: "Slug already in use" }, { status: 409 })
      }
    }

    const updated = await prisma.landingPage.update({
      where: { id },
      data,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error("[PAGES] PUT error:", e?.message)
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 })
  }
}

export async function DELETE(
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

    await prisma.landingPage.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error("[PAGES] DELETE error:", e?.message)
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 })
  }
}
