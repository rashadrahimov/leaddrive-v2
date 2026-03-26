import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year = Number(req.nextUrl.searchParams.get("year") || new Date().getFullYear())
  if (isNaN(year) || year < 2020 || year > 2050) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  const entries = await prisma.salesForecast.findMany({
    where: { organizationId: orgId, year },
    include: { budgetDept: { select: { id: true, key: true, label: true } } },
    orderBy: [{ budgetDept: { sortOrder: "asc" } }, { month: "asc" }],
  })

  return NextResponse.json({ success: true, data: entries })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { year, entries } = body as {
    year: number
    entries: Array<{ departmentId: string; month: number; amount: number; notes?: string }>
  }

  if (!year || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "year and entries[] required" }, { status: 400 })
  }

  const results = await prisma.$transaction(
    entries
      .filter((e) => e.departmentId && e.month >= 1 && e.month <= 12)
      .map((e) =>
        prisma.salesForecast.upsert({
          where: {
            organizationId_departmentId_year_month: {
              organizationId: orgId,
              departmentId: e.departmentId,
              year,
              month: e.month,
            },
          },
          update: { amount: Number(e.amount) || 0, notes: e.notes || null },
          create: {
            organizationId: orgId,
            departmentId: e.departmentId,
            year,
            month: e.month,
            amount: Number(e.amount) || 0,
            notes: e.notes || null,
          },
        })
      )
  )

  return NextResponse.json({ success: true, count: results.length }, { status: 201 })
}
