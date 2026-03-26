import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — get category mapping for an integration
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const integrationId = req.nextUrl.searchParams.get("integrationId")
  if (!integrationId) {
    return NextResponse.json({ error: "integrationId required" }, { status: 400 })
  }

  const integration = await prisma.accountingIntegration.findFirst({
    where: { id: integrationId, organizationId: orgId },
    select: { categoryMapping: true, name: true },
  })

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 })
  }

  // Also return available budget cost types for mapping targets
  const costTypes = await prisma.budgetCostType.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, code: true, lineType: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({
    mapping: integration.categoryMapping,
    integrationName: integration.name,
    costTypes,
  })
}

// POST — update category mapping
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { integrationId, mapping } = await req.json()

  if (!integrationId || !mapping) {
    return NextResponse.json({ error: "integrationId and mapping are required" }, { status: 400 })
  }

  const updated = await prisma.accountingIntegration.updateMany({
    where: { id: integrationId, organizationId: orgId },
    data: { categoryMapping: mapping },
  })

  if (updated.count === 0) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
