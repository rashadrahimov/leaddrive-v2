import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/v1/deals/[id]/add-to-pricing
 * Creates an AdditionalSale linked to the deal's company pricing profile.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: dealId } = await params

  try {
    const session = await auth()
    const userId = session?.user?.id || null

    // Get the deal with company
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId: orgId },
      include: { company: { select: { id: true, name: true } } },
    })
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })
    if (!deal.companyId) return NextResponse.json({ error: "Deal has no company linked" }, { status: 400 })

    // Find pricing profile for this company
    const profile = await prisma.pricingProfile.findFirst({
      where: { organizationId: orgId, companyId: deal.companyId },
    })
    if (!profile) return NextResponse.json({ error: "No pricing profile found for this company" }, { status: 404 })

    const body = await req.json()
    const { type, name, description, categoryName, unit, qty, price, effectiveDate, endDate } = body

    if (!type || !name || !effectiveDate) {
      return NextResponse.json({ error: "type, name, and effectiveDate are required" }, { status: 400 })
    }

    const total = (qty || 1) * (price || 0)
    const sale = await prisma.additionalSale.create({
      data: {
        organizationId: orgId,
        profileId: profile.id,
        dealId,
        type,
        name,
        description: description || null,
        categoryName: categoryName || null,
        unit: unit || null,
        qty: qty || 1,
        price: price || 0,
        total,
        effectiveDate: new Date(effectiveDate),
        endDate: endDate ? new Date(endDate) : null,
        status: "active",
        createdBy: userId,
      },
      include: {
        profile: {
          select: { id: true, companyCode: true, company: { select: { id: true, name: true } } },
        },
      },
    })

    return NextResponse.json({ success: true, data: sale }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to add to pricing" }, { status: 500 })
  }
}
