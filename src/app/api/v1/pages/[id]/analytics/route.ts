import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId(req)
  if (!orgId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const page = await prisma.landingPage.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!page)
      return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Get views grouped by day for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

    const views = await prisma.pageView.findMany({
      where: { landingPageId: id, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    const viewsByDay: Record<string, number> = {}
    for (const v of views) {
      const day = v.createdAt.toISOString().split("T")[0]
      viewsByDay[day] = (viewsByDay[day] || 0) + 1
    }

    // Get submissions grouped by day
    const submissions = await prisma.formSubmission.findMany({
      where: { landingPageId: id, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    })

    const subsByDay: Record<string, number> = {}
    for (const s of submissions) {
      const day = s.createdAt.toISOString().split("T")[0]
      subsByDay[day] = (subsByDay[day] || 0) + 1
    }

    // Build chart data for last 30 days
    const chartData = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const day = d.toISOString().split("T")[0]
      chartData.push({
        date: day,
        views: viewsByDay[day] || 0,
        submissions: subsByDay[day] || 0,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        totalViews: page.totalViews,
        totalSubmissions: page.totalSubmissions,
      },
    })
  } catch (e) {
    console.error("Page analytics error:", e)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    )
  }
}
