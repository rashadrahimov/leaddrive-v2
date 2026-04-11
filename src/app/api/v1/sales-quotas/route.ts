import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { prisma, logAudit } from "@/lib/prisma"
import { DEFAULT_CURRENCY } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year = parseInt(req.nextUrl.searchParams.get("year") || String(new Date().getFullYear()))
  const userId = req.nextUrl.searchParams.get("userId") || undefined

  const quotas = await prisma.salesQuota.findMany({
    where: {
      organizationId: session.orgId,
      year,
      ...(userId ? { userId } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ userId: "asc" }, { quarter: "asc" }],
  })

  // Get actual won deals per user per quarter for comparison
  const wonDeals = await prisma.deal.findMany({
    where: {
      organizationId: session.orgId,
      stage: "WON",
      updatedAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
    select: { assignedTo: true, valueAmount: true, updatedAt: true },
  })

  const actualsByUserQuarter: Record<string, number> = {}
  for (const d of wonDeals) {
    if (!d.assignedTo) continue
    const q = Math.ceil((new Date(d.updatedAt).getMonth() + 1) / 3)
    const key = `${d.assignedTo}_${q}`
    actualsByUserQuarter[key] = (actualsByUserQuarter[key] || 0) + (d.valueAmount || 0)
  }

  const data = quotas.map((q: any) => ({
    ...q,
    actual: actualsByUserQuarter[`${q.userId}_${q.quarter}`] || 0,
    attainment: q.amount > 0
      ? Math.round(((actualsByUserQuarter[`${q.userId}_${q.quarter}`] || 0) / q.amount) * 100)
      : 0,
  }))

  return NextResponse.json({ success: true, data })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { userId, year, quarter, amount, currency } = body

  if (!userId || !year || !quarter || amount === undefined) {
    return NextResponse.json({ error: "userId, year, quarter, amount required" }, { status: 400 })
  }

  const quota = await prisma.salesQuota.upsert({
    where: {
      organizationId_userId_year_quarter: {
        organizationId: session.orgId,
        userId,
        year: parseInt(year),
        quarter: parseInt(quarter),
      },
    },
    update: { amount: parseFloat(amount), currency: currency || DEFAULT_CURRENCY },
    create: {
      organizationId: session.orgId,
      userId,
      year: parseInt(year),
      quarter: parseInt(quarter),
      amount: parseFloat(amount),
      currency: currency || DEFAULT_CURRENCY,
    },
  })

  logAudit(session.orgId, "create", "sales_quota", quota.id, `Quota: ${year} Q${quarter}`)

  return NextResponse.json({ success: true, data: quota })
}
