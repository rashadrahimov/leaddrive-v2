import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { writeCostModelLog, invalidateAiCache } from "@/lib/cost-model/db"

export async function GET(req: NextRequest) {
  try {
    const orgId = await getOrgId(req)
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const params = await prisma.pricingParameters.findUnique({
      where: { organizationId: orgId },
    })

    return NextResponse.json({ success: true, data: params })
  } catch (error) {
    console.error("Get parameters error:", error)
    return NextResponse.json({ error: "Failed to load parameters" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const orgId = await getOrgId(req)
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()

    const oldParams = await prisma.pricingParameters.findUnique({
      where: { organizationId: orgId },
    })

    // If totalUsers not manually set, recalculate from companies
    if (body.totalUsers === undefined || body.totalUsers === null) {
      const agg = await prisma.company.aggregate({
        where: { organizationId: orgId, category: "client" },
        _sum: { userCount: true },
      })
      body.totalUsers = agg._sum.userCount ?? oldParams?.totalUsers ?? 0
    }

    const updated = await prisma.pricingParameters.upsert({
      where: { organizationId: orgId },
      update: { ...body, updatedAt: new Date() },
      create: { organizationId: orgId, ...body },
    })

    await writeCostModelLog(orgId, "pricing_parameters", updated.id, "update", oldParams, updated)
    invalidateAiCache()

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("Update parameters error:", error)
    return NextResponse.json({ error: "Failed to update parameters" }, { status: 500 })
  }
}
