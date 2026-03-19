import { NextRequest, NextResponse } from "next/server"
import { callCompute } from "@/lib/compute"

export async function GET(req: NextRequest) {
  const orgId = req.headers.get("x-organization-id")
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // TODO: Fetch from Prisma when DB is available
    // const params = await prisma.pricingParameters.findUnique({ where: { organizationId: orgId } })
    // const overhead = await prisma.overheadCost.findMany({ where: { organizationId: orgId }, orderBy: { sortOrder: 'asc' } })
    // const employees = await prisma.costEmployee.findMany({ where: { organizationId: orgId } })
    // const companies = await prisma.company.findMany({ where: { organizationId: orgId, status: 'active' } })
    // const services = await prisma.clientService.findMany({ where: { organizationId: orgId, isActive: true } })

    // For now, return stub — compute service needs real data
    const result = await callCompute<{ data: Record<string, unknown> }>("/compute/cost-model/analytics", {
      params: {},
      overhead_items: [],
      employees: [],
    })

    return NextResponse.json({ success: true, data: result.data })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cost model computation failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
