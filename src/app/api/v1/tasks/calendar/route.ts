import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 })
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59)

  try {
    const tasks = await prisma.task.findMany({
      where: {
        organizationId: orgId,
        dueDate: { gte: startDate, lte: endDate },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
    })

    return NextResponse.json({ success: true, data: { tasks, month, year } })
  } catch {
    return NextResponse.json({ success: true, data: { tasks: [], month, year } })
  }
}
