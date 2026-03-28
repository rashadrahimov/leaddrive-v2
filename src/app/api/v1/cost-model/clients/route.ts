import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const companies = await prisma.company.findMany({
      where: { organizationId: orgId, status: "active" },
      select: {
        id: true,
        name: true,
        costCode: true,
        userCount: true,
      },
      orderBy: { name: "asc" },
    })

    const services = await prisma.clientService.findMany({
      where: { organizationId: orgId, isActive: true },
    })

    const clients = companies
      .map((company: any) => {
        const companyServices = services.filter((s: any) => s.companyId === company.id)
        const totalRevenue = companyServices.reduce((s: number, cs: any) => s + cs.monthlyRevenue, 0)
        return {
          id: company.id,
          name: company.name,
          costCode: company.costCode,
          userCount: company.userCount,
          services: companyServices.map((s: any) => ({
            id: s.id,
            serviceType: s.serviceType,
            monthlyRevenue: s.monthlyRevenue,
            isActive: s.isActive,
          })),
          totalRevenue,
        }
      })
      .filter((c: any) => c.services.length > 0)

    return NextResponse.json({
      success: true,
      data: { clients },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAuth(req, "settings", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId

  try {
    const { updates } = await req.json()
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "updates array required" }, { status: 400 })
    }

    for (const { id, monthlyRevenue } of updates) {
      await prisma.clientService.updateMany({
        where: { id, organizationId: orgId },
        data: { monthlyRevenue },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
