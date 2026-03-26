import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — list active cash flow alerts
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year = parseInt(req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString())

  const alerts = await prisma.cashFlowAlert.findMany({
    where: { organizationId: orgId, year, isResolved: false },
    orderBy: [{ month: "asc" }],
  })

  return NextResponse.json(alerts)
}

// POST — resolve an alert
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { alertId } = await req.json()
  if (!alertId) return NextResponse.json({ error: "alertId required" }, { status: 400 })

  await prisma.cashFlowAlert.updateMany({
    where: { id: alertId, organizationId: orgId },
    data: { isResolved: true },
  })

  return NextResponse.json({ success: true })
}
