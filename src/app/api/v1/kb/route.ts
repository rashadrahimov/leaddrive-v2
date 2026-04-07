import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const status = searchParams.get("status")

  try {
    const where = {
      organizationId: orgId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
      ...(status ? { status } : {}),
    }

    const [articles, total] = await Promise.all([
      prisma.kbArticle.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { category: true },
      }),
      prisma.kbArticle.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { articles, total, page, limit, search },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { articles: [], total: 0, page, limit, search },
    })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createArticleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const article = await prisma.kbArticle.create({
      data: { organizationId: orgId, ...parsed.data },
    })
    return NextResponse.json({ success: true, data: article }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
