import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — list exchange rate history
// ?currencyCode=USD&limit=50
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const currencyCode = req.nextUrl.searchParams.get("currencyCode")
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100")

  const where: any = { organizationId: orgId }
  if (currencyCode) where.currencyCode = currencyCode

  const rates = await prisma.currencyRateHistory.findMany({
    where,
    orderBy: { rateDate: "desc" },
    take: limit,
  })

  // Also get current currencies for reference
  const currencies = await prisma.currency.findMany({
    where: { organizationId: orgId },
    orderBy: { code: "asc" },
  })

  return NextResponse.json({ rates, currencies })
}

// POST — add a new exchange rate entry
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { currencyCode, rate, rateDate } = body

  if (!currencyCode || !rate) {
    return NextResponse.json(
      { error: "currencyCode and rate are required" },
      { status: 400 },
    )
  }

  const entry = await prisma.currencyRateHistory.create({
    data: {
      organizationId: orgId,
      currencyCode,
      rate: parseFloat(rate),
      rateDate: rateDate ? new Date(rateDate) : new Date(),
    },
  })

  // Also update the Currency table's exchangeRate for convenience
  await prisma.currency.updateMany({
    where: { organizationId: orgId, code: currencyCode },
    data: { exchangeRate: parseFloat(rate) },
  })

  return NextResponse.json(entry, { status: 201 })
}
