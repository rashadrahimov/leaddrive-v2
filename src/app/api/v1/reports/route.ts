import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [
      companies,
      contacts,
      deals,
      leads,
      tasks,
      tickets,
      wonDeals,
      openTickets,
      overdueTasks,
    ] = await Promise.all([
      prisma.company.count({ where: { organizationId: orgId } }),
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.deal.count({ where: { organizationId: orgId } }),
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.task.count({ where: { organizationId: orgId } }),
      prisma.ticket.count({ where: { organizationId: orgId } }),
      prisma.deal.findMany({
        where: { organizationId: orgId, stage: "WON" },
        select: { valueAmount: true },
      }),
      prisma.ticket.count({
        where: { organizationId: orgId, status: { in: ["new", "in_progress", "waiting"] } },
      }),
      prisma.task.count({
        where: {
          organizationId: orgId,
          status: { not: "completed" },
          dueDate: { lt: new Date() },
        },
      }),
    ])

    // Revenue from won deals
    const totalRevenue = wonDeals.reduce((s, d) => s + (d.valueAmount || 0), 0)

    // Pipeline by stage
    const dealsByStage = await prisma.deal.groupBy({
      by: ["stage"],
      where: { organizationId: orgId },
      _count: true,
      _sum: { valueAmount: true },
    })

    // Tasks by status
    const tasksByStatus = await prisma.task.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    })

    // Tickets by status
    const ticketsByStatus = await prisma.ticket.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    })

    // Leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: true,
    })

    const completedTasks = tasksByStatus.find(t => t.status === "completed")?._count || 0
    const totalTasks = tasks
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const resolvedTickets = ticketsByStatus.find(t => t.status === "resolved")?._count || 0
    const closedTickets = ticketsByStatus.find(t => t.status === "closed")?._count || 0
    const ticketResolutionRate = tickets > 0 ? Math.round(((resolvedTickets + closedTickets) / tickets) * 100) : 0

    // Top 10 companies by revenue (from contracts)
    const topCompanies = await prisma.company.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        contracts: {
          select: { monthlyValue: true },
        },
      },
      take: 100,
    })

    const topCompaniesByRevenue = topCompanies
      .map(c => ({
        name: c.name,
        revenue: c.contracts.reduce((s, ct) => s + (ct.monthlyValue || 0), 0),
      }))
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Lead funnel — companies by leadStatus
    const leadFunnel = await prisma.company.groupBy({
      by: ["leadStatus"],
      where: { organizationId: orgId },
      _count: true,
    })

    // CSAT (Customer Satisfaction) from ticket ratings
    const csatData = await prisma.ticket.aggregate({
      where: { organizationId: orgId, satisfactionRating: { not: null } },
      _avg: { satisfactionRating: true },
      _count: { satisfactionRating: true },
    })
    const csatByRating = await prisma.ticket.groupBy({
      by: ["satisfactionRating"],
      where: { organizationId: orgId, satisfactionRating: { not: null } },
      _count: true,
    })

    // Financial overview from contracts
    const contractsData = await prisma.contract.findMany({
      where: { organizationId: orgId },
      select: { valueAmount: true, status: true },
    })
    const totalContractRevenue = contractsData
      .filter(c => c.status === "active")
      .reduce((s, c) => s + (c.valueAmount || 0), 0)

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          companies,
          contacts,
          deals,
          leads,
          tasks,
          tickets,
          totalRevenue,
          openTickets,
          overdueTasks,
        },
        revenue: {
          totalRevenue,
          wonDealsCount: wonDeals.length,
          avgDealSize: wonDeals.length > 0 ? Math.round(totalRevenue / wonDeals.length) : 0,
        },
        pipeline: {
          stages: dealsByStage.map(s => ({
            stage: s.stage,
            count: s._count,
            value: s._sum.valueAmount || 0,
          })),
          totalPipelineValue: dealsByStage.reduce((s, d) => s + (d._sum.valueAmount || 0), 0),
        },
        tasks: {
          total: tasks,
          byStatus: tasksByStatus.map(t => ({ status: t.status, count: t._count })),
          completionRate: taskCompletionRate,
          overdue: overdueTasks,
        },
        tickets: {
          total: tickets,
          byStatus: ticketsByStatus.map(t => ({ status: t.status, count: t._count })),
          resolutionRate: ticketResolutionRate,
          open: openTickets,
        },
        leads: {
          total: leads,
          byStatus: leadsByStatus.map(l => ({ status: l.status, count: l._count })),
          conversionRate: leads > 0 ? Math.round((leadsByStatus.find(l => l.status === "converted")?._count || 0) / leads * 100) : 0,
        },
        topCompanies: topCompaniesByRevenue,
        leadFunnel: leadFunnel.map(f => ({ status: f.leadStatus, count: f._count })),
        financial: {
          monthlyRevenue: totalContractRevenue,
          wonDealsRevenue: totalRevenue,
          totalContracts: contractsData.length,
          activeContracts: contractsData.filter(c => c.status === "active" || c.status === "Active").length,
        },
        csat: {
          average: csatData._avg.satisfactionRating ? Math.round(csatData._avg.satisfactionRating * 10) / 10 : 0,
          totalRatings: csatData._count.satisfactionRating,
          byRating: csatByRating.map(r => ({ rating: r.satisfactionRating, count: r._count })),
        },
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
