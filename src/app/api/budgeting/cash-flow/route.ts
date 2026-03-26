import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — get cash flow data for a year
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year = parseInt(req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString())

  const entries = await prisma.cashFlowEntry.findMany({
    where: { organizationId: orgId, year },
    orderBy: [{ month: "asc" }, { entryType: "asc" }],
  })

  // Build monthly summary
  const monthlyData = []
  let runningBalance = 0

  // Get opening balance from previous year's last month
  const prevYearEntries = await prisma.cashFlowEntry.findMany({
    where: { organizationId: orgId, year: year - 1 },
  })
  const prevInflows = prevYearEntries.filter((e) => e.entryType === "inflow").reduce((s, e) => s + e.amount, 0)
  const prevOutflows = prevYearEntries.filter((e) => e.entryType === "outflow").reduce((s, e) => s + e.amount, 0)
  runningBalance = prevInflows - prevOutflows

  for (let m = 1; m <= 12; m++) {
    const monthEntries = entries.filter((e) => e.month === m)
    const inflows = monthEntries.filter((e) => e.entryType === "inflow").reduce((s, e) => s + e.amount, 0)
    const outflows = monthEntries.filter((e) => e.entryType === "outflow").reduce((s, e) => s + e.amount, 0)
    const opening = runningBalance
    runningBalance = opening + inflows - outflows

    monthlyData.push({
      month: m,
      year,
      opening,
      inflows,
      outflows,
      net: inflows - outflows,
      closing: runningBalance,
      inflowEntries: monthEntries.filter((e) => e.entryType === "inflow"),
      outflowEntries: monthEntries.filter((e) => e.entryType === "outflow"),
    })
  }

  return NextResponse.json({
    year,
    months: monthlyData,
    totalInflows: entries.filter((e) => e.entryType === "inflow").reduce((s, e) => s + e.amount, 0),
    totalOutflows: entries.filter((e) => e.entryType === "outflow").reduce((s, e) => s + e.amount, 0),
  })
}

// POST — create a manual cash flow entry
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { year, month, entryType, amount, description, source, sourceId, paymentDate, currencyCode, isProjected } = body

  if (!year || !month || !entryType || !amount) {
    return NextResponse.json({ error: "year, month, entryType, amount required" }, { status: 400 })
  }

  const entry = await prisma.cashFlowEntry.create({
    data: {
      organizationId: orgId,
      year,
      month,
      entryType,
      source: source || "manual",
      sourceId: sourceId || null,
      amount: parseFloat(amount),
      description: description || null,
      paymentDate: paymentDate ? new Date(paymentDate) : null,
      currencyCode: currencyCode || "AZN",
      isProjected: isProjected ?? true,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
