import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyAdjustments, type PricingAdjustments } from "@/lib/pricing"

async function loadPricingData(orgId: string) {
  const profiles = await prisma.pricingProfile.findMany({
    where: { organizationId: orgId },
    include: {
      group: true,
      categories: {
        include: { category: true, services: { orderBy: { sortOrder: "asc" } } },
      },
    },
  })
  const data: Record<string, any> = {}
  for (const profile of profiles) {
    const categories: Record<string, any> = {}
    for (const pc of profile.categories) {
      categories[pc.category.name] = {
        total: pc.total,
        services: pc.services.map((s: any) => ({ name: s.name, qty: s.qty, price: s.price, total: s.total, unit: s.unit })),
      }
    }
    data[profile.companyCode] = {
      group: profile.group.name, categories,
      monthly: profile.monthlyTotal, annual: profile.annualTotal, monthly_total: profile.monthlyTotal,
    }
  }
  return data
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const session = await auth()
  const userId = session?.user?.id || null
  const { companies, adjustments, effective_date, notes } = await req.json() as { companies: string[]; adjustments: PricingAdjustments; effective_date: string | null; notes: string }
  if (!companies?.length) return NextResponse.json({ error: "companies required" }, { status: 400 })
  const allData = await loadPricingData(orgId)
  const adjusted = applyAdjustments(allData, adjustments)
  const records = companies.filter((c) => c in allData).map((c) => ({
    organizationId: orgId, companyCode: c, oldPrices: allData[c], newPrices: adjusted[c],
    status: "pending", notes: notes || null, effectiveDate: effective_date || null, createdBy: userId,
  }))
  if (!records.length) return NextResponse.json({ error: "No valid companies" }, { status: 400 })
  const created = await prisma.priceChange.createMany({ data: records })
  return NextResponse.json({ success: true, data: { created: created.count } })
}
