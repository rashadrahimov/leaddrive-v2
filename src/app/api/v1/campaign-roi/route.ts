import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      include: {
        deals: {
          where: { organizationId: orgId },
          select: {
            id: true,
            stage: true,
            valueAmount: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const data = campaigns.map((c: any) => {
      const wonDeals = c.deals.filter((d: any) => d.stage === "WON")
      const revenue = wonDeals.reduce((sum: number, d: any) => sum + d.valueAmount, 0)
      const cost = c.budget || 0
      const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        type: c.type,
        budget: c.budget,
        totalRecipients: c.totalRecipients,
        totalSent: c.totalSent,
        totalOpened: c.totalOpened,
        totalClicked: c.totalClicked,
        sentAt: c.sentAt,
        revenue,
        totalDeals: c.deals.length,
        wonDeals: wonDeals.length,
        roi,
      }
    })

    const totalRevenue = data.reduce((s: number, c: any) => s + c.revenue, 0)
    const totalCost = data.reduce((s: number, c: any) => s + c.budget, 0)
    const totalRoi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        campaigns: data,
        summary: { totalRevenue, totalCost, totalRoi, campaignCount: data.length },
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
