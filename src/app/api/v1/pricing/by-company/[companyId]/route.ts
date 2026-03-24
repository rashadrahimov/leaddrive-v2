import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ companyId: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { companyId } = await params

  try {
    const profile = await prisma.pricingProfile.findFirst({
      where: { organizationId: orgId, companyId, isActive: true },
      include: {
        categories: {
          include: {
            category: true,
            services: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { category: { sortOrder: "asc" } },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ success: true, data: { services: [] } })
    }

    // Flatten all services across categories
    const services = profile.categories.flatMap((pc) =>
      pc.services.map((s) => ({
        name: s.name,
        description: pc.category?.name || "",
        qty: Number(s.qty) || 1,
        unitPrice: Number(s.price) || 0,
        total: Number(s.total) || 0,
        unit: s.unit || "",
      }))
    ).filter((s) => s.unitPrice > 0)

    return NextResponse.json({
      success: true,
      data: {
        services,
        monthlyTotal: Number(profile.monthlyTotal) || 0,
        companyCode: profile.companyCode,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
