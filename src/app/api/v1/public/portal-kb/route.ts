import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"

export async function GET(req: NextRequest) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const articleId = searchParams.get("id")

  // Single article view — return full content and increment viewCount
  if (articleId) {
    const article = await prisma.kbArticle.findFirst({
      where: {
        id: articleId,
        organizationId: user.organizationId,
        status: "published",
      },
    })
    if (!article) return NextResponse.json({ error: "Article not found" }, { status: 404 })

    await prisma.kbArticle.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: article.id,
        title: article.title,
        content: article.content,
        tags: article.tags,
        viewCount: article.viewCount + 1,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
    })
  }

  // List view — return truncated content
  const articles = await prisma.kbArticle.findMany({
    where: {
      organizationId: user.organizationId,
      status: "published",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      tags: true,
      viewCount: true,
      createdAt: true,
    },
  })

  const data = articles.map((a) => ({
    id: a.id,
    title: a.title,
    content: a.content ? a.content.slice(0, 200) : "",
    tags: a.tags,
    viewCount: a.viewCount,
    createdAt: a.createdAt,
  }))

  return NextResponse.json({ success: true, data })
}
