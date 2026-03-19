import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  // Try header first, then session
  let orgId = req.headers.get("x-organization-id")

  if (!orgId) {
    const session = await auth()
    orgId = (session?.user as any)?.organizationId || null
  }

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [
      companiesCount,
      contactsCount,
      activeDeals,
      dealsPipelineValue,
      openTickets,
      overdueTasks,
      recentActivities,
      myTasks,
    ] = await Promise.all([
      prisma.company.count({ where: { organizationId: orgId } }),
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.deal.count({ where: { organizationId: orgId, stage: { notIn: ["WON", "LOST"] } } }),
      prisma.deal.aggregate({ where: { organizationId: orgId, stage: { notIn: ["LOST"] } }, _sum: { valueAmount: true } }),
      prisma.ticket.count({ where: { organizationId: orgId, status: { in: ["new", "in_progress", "waiting"] } } }),
      prisma.task.count({ where: { organizationId: orgId, status: { not: "completed" }, dueDate: { lt: new Date() } } }),
      prisma.activity.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 10, include: { contact: { select: { fullName: true } }, company: { select: { name: true } } } }),
      prisma.task.findMany({ where: { organizationId: orgId, status: { not: "completed" } }, orderBy: { dueDate: "asc" }, take: 5 }),
    ])

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const deals = await prisma.deal.findMany({
      where: { organizationId: orgId, stage: "WON", createdAt: { gte: sixMonthsAgo } },
      select: { valueAmount: true, createdAt: true },
    })

    const revenueByMonth: Record<string, number> = {}
    for (const deal of deals) {
      const month = deal.createdAt.toISOString().slice(0, 7)
      revenueByMonth[month] = (revenueByMonth[month] || 0) + deal.valueAmount
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          companies: companiesCount,
          contacts: contactsCount,
          activeDeals,
          pipelineValue: dealsPipelineValue._sum.valueAmount || 0,
          openTickets,
          overdueTasks,
        },
        revenueByMonth,
        recentActivities,
        myTasks,
      },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        stats: { companies: 0, contacts: 0, activeDeals: 0, pipelineValue: 0, openTickets: 0, overdueTasks: 0 },
        revenueByMonth: {},
        recentActivities: [],
        myTasks: [],
      },
    })
  }
}
