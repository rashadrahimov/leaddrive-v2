import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const entries = await prisma.budgetForecastEntry.findMany({
    where: { planId, organizationId: orgId },
    orderBy: [{ year: "asc" }, { month: "asc" }, { category: "asc" }],
  })

  return NextResponse.json({ success: true, data: entries })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Supports bulk upsert: body.entries = [{ planId, month, year, category, forecastAmount }]
  const entries: Array<{ planId: string; month: number; year: number; category: string; forecastAmount: number }> =
    Array.isArray(body.entries) ? body.entries : [body]

  const results = []
  for (const entry of entries) {
    const { planId, month, year, category, forecastAmount } = entry
    if (!planId || !month || !year || !category) continue

    const upserted = await prisma.budgetForecastEntry.upsert({
      where: { planId_year_month_category: { planId, year, month, category } },
      update: { forecastAmount: Number(forecastAmount) ?? 0 },
      create: {
        organizationId: orgId,
        planId,
        month,
        year,
        category,
        forecastAmount: Number(forecastAmount) ?? 0,
      },
    })
    results.push(upserted)
  }

  return NextResponse.json({ success: true, data: results }, { status: 201 })
}
