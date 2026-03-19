import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  textBody: z.string().optional(),
  category: z.string().optional(),
  variables: z.string().optional(),
  language: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const category = searchParams.get("category")

  try {
    const where = {
      organizationId: orgId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(category ? { category } : {}),
    }

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.emailTemplate.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { templates, total, page, limit, search },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { templates: [], total: 0, page, limit, search },
    })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const template = await prisma.emailTemplate.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: template }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
