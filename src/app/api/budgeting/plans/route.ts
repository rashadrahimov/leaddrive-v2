import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const plans = await prisma.budgetPlan.findMany({
    where: { organizationId: orgId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })

  return NextResponse.json({ success: true, data: plans })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, periodType, year, month, quarter, notes } = body

  if (!name || !periodType || !year) {
    return NextResponse.json({ error: "name, periodType, year are required" }, { status: 400 })
  }

  const y = Number(year)
  if (y < 2020 || y > 2050) {
    return NextResponse.json({ error: "Год должен быть от 2020 до 2050" }, { status: 400 })
  }
  if (month && (Number(month) < 1 || Number(month) > 12)) {
    return NextResponse.json({ error: "Месяц должен быть от 1 до 12" }, { status: 400 })
  }
  if (quarter && (Number(quarter) < 1 || Number(quarter) > 4)) {
    return NextResponse.json({ error: "Квартал должен быть от 1 до 4" }, { status: 400 })
  }
  if (!["monthly", "quarterly", "annual"].includes(periodType)) {
    return NextResponse.json({ error: "periodType должен быть monthly, quarterly или annual" }, { status: 400 })
  }

  const plan = await prisma.budgetPlan.create({
    data: {
      organizationId: orgId,
      name,
      periodType,
      year: Number(year),
      month: month ? Number(month) : null,
      quarter: quarter ? Number(quarter) : null,
      notes: notes || null,
    },
  })

  return NextResponse.json({ success: true, data: plan }, { status: 201 })
}
