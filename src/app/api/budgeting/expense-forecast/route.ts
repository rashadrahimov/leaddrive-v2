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

  const entries = await prisma.expenseForecast.findMany({
    where: { organizationId: orgId, year },
    include: {
      budgetCostType: { select: { id: true, key: true, label: true, isShared: true } },
      budgetDept: { select: { id: true, key: true, label: true } },
    },
    orderBy: [{ budgetCostType: { sortOrder: "asc" } }, { month: "asc" }],
  })

  return NextResponse.json({ success: true, data: entries })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { year, entries } = body as {
    year: number
    entries: Array<{ costTypeId: string; departmentId: string | null; month: number; amount: number; notes?: string }>
  }

  if (!year || !Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "year and entries[] required" }, { status: 400 })
  }

  // Use findFirst + update/create to handle nullable departmentId
  let count = 0
  for (const e of entries) {
    if (!e.costTypeId || e.month < 1 || e.month > 12) continue

    const existing = await prisma.expenseForecast.findFirst({
      where: {
        organizationId: orgId,
        costTypeId: e.costTypeId,
        departmentId: e.departmentId ?? null,
        year,
        month: e.month,
      },
    })

    if (existing) {
      await prisma.expenseForecast.update({
        where: { id: existing.id },
        data: { amount: Number(e.amount) || 0, notes: e.notes || null },
      })
    } else {
      await prisma.expenseForecast.create({
        data: {
          organizationId: orgId,
          costTypeId: e.costTypeId,
          departmentId: e.departmentId || null,
          year,
          month: e.month,
          amount: Number(e.amount) || 0,
          notes: e.notes || null,
        },
      })
    }
    count++
  }

  return NextResponse.json({ success: true, count }, { status: 201 })
}
