import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_UNIT_TYPES = [
  "Per Device",
  "Per Systems",
  "Per Company",
  "Per User",
  "Per VM",
  "Per 2 vCPU",
  "Per GB",
  "Per Resource",
  "Project based",
  "Man/Day",
  "Hourly",
  "Hourly Rates",
]

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Get unique unit types from existing services
  const dbUnits = await prisma.pricingService.findMany({
    where: { organizationId: orgId },
    select: { unit: true },
    distinct: ["unit"],
  })

  const unitSet = new Set(DEFAULT_UNIT_TYPES)
  for (const { unit } of dbUnits) {
    if (unit) unitSet.add(unit)
  }

  return NextResponse.json({ success: true, data: Array.from(unitSet).sort() })
}
