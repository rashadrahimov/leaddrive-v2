import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  let orgId = req.headers.get("x-organization-id")
  if (!orgId) {
    const session = await auth()
    orgId = session?.user?.organizationId || null
  }
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const [
      companiesCount,
      companiesAgg,
      contactsCount,
      activeDeals,
      pipelineAgg,
      openTickets,
      criticalTickets,
      slaBreached,
      csatAgg,
      overdueTasks,
      totalTasks,
      completedTasks,
      dueThisWeek,
      wonThisMonth,
      wonValueAgg,
      lostThisMonth,
      recentActivities,
      activityCount30d,
      leadsByTemp,
      serviceRevenue,
      dealsByStage,
      ticketsByStatus,
    ] = await Promise.all([
      // Companies
      prisma.company.count({ where: { organizationId: orgId, category: "client" } }),
      prisma.company.aggregate({ where: { organizationId: orgId, category: "client" }, _sum: { userCount: true } }),
      // Contacts
      prisma.contact.count({ where: { organizationId: orgId } }),
      // Deals
      prisma.deal.count({ where: { organizationId: orgId, stage: { notIn: ["WON", "LOST"] } } }),
      prisma.deal.aggregate({ where: { organizationId: orgId, stage: { notIn: ["LOST"] } }, _sum: { valueAmount: true } }),
      // Tickets
      prisma.ticket.count({ where: { organizationId: orgId, status: { in: ["new", "in_progress", "waiting"] } } }),
      prisma.ticket.count({ where: { organizationId: orgId, priority: "urgent", status: { in: ["new", "in_progress", "waiting"] } } }),
      prisma.ticket.count({ where: { organizationId: orgId, slaDueAt: { lt: now }, status: { in: ["new", "in_progress", "waiting"] } } }),
      prisma.ticket.aggregate({ where: { organizationId: orgId, satisfactionRating: { gt: 0 } }, _avg: { satisfactionRating: true }, _count: true }),
      // Tasks
      prisma.task.count({ where: { organizationId: orgId, status: { not: "completed" }, dueDate: { lt: now } } }),
      prisma.task.count({ where: { organizationId: orgId } }),
      prisma.task.count({ where: { organizationId: orgId, status: "completed" } }),
      prisma.task.count({ where: { organizationId: orgId, status: { not: "completed" }, dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) } } }),
      // Won/Lost this month
      prisma.deal.count({ where: { organizationId: orgId, stage: "WON", updatedAt: { gte: startOfMonth } } }),
      prisma.deal.aggregate({ where: { organizationId: orgId, stage: "WON", updatedAt: { gte: startOfMonth } }, _sum: { valueAmount: true } }),
      prisma.deal.count({ where: { organizationId: orgId, stage: "LOST", updatedAt: { gte: startOfMonth } } }),
      // Activity
      prisma.activity.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 8, include: { contact: { select: { fullName: true } }, company: { select: { name: true } } } }),
      prisma.activity.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } }),
      // Leads by temperature
      prisma.company.groupBy({ by: ["leadTemperature"], where: { organizationId: orgId, category: "client", leadTemperature: { not: null } }, _count: true }),
      // Service revenue
      prisma.clientService.groupBy({ by: ["serviceType"], where: { organizationId: orgId, isActive: true }, _sum: { monthlyRevenue: true } }),
      // Deals by stage
      prisma.deal.groupBy({ by: ["stage"], where: { organizationId: orgId }, _count: true, _sum: { valueAmount: true } }),
      // Tickets by status
      prisma.ticket.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true }),
    ])

    // Cost model summary
    let costSummary = { totalCost: 0, totalRevenue: 0, margin: 0, marginPct: 0, profitableClients: 0, lossClients: 0 }
    try {
      const costRes = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1/cost-model`, {
        headers: { "x-organization-id": orgId },
      })
      const costJson = await costRes.json()
      if (costJson.success) {
        const d = costJson.data
        costSummary = {
          totalCost: d.grandTotalG || 0,
          totalRevenue: d.summary?.totalRevenue || 0,
          margin: d.summary?.totalMargin || 0,
          marginPct: d.summary?.marginPct || 0,
          profitableClients: d.summary?.profitableClients || 0,
          lossClients: d.summary?.lossClients || 0,
        }
      }
    } catch {}

    // Top clients
    let topClients: any[] = []
    let bottomClients: any[] = []
    try {
      const clientsRes = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/v1/cost-model/clients`, {
        headers: { "x-organization-id": orgId },
      })
      const cJson = await clientsRes.json()
      if (cJson.success && cJson.data?.clients) {
        const sorted = cJson.data.clients.sort((a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
        topClients = sorted.filter((c: any) => c.totalRevenue > 0).slice(0, 5).map((c: any) => ({
          name: c.name, revenue: c.totalRevenue, margin: c.margin, marginPct: c.marginPct, userCount: c.userCount,
        }))
        bottomClients = sorted.filter((c: any) => c.margin < 0).slice(-3).map((c: any) => ({
          name: c.name, revenue: c.totalRevenue, margin: c.margin, marginPct: c.marginPct, userCount: c.userCount,
        }))
      }
    } catch {}

    // Risks
    const risks: { severity: string; title: string; description: string; metric: string }[] = []
    if (costSummary.marginPct < 5 && costSummary.totalRevenue > 0)
      risks.push({ severity: "critical", title: "Низкая маржа", description: `Маржинальность ${costSummary.marginPct.toFixed(1)}% — ниже целевого уровня 15%`, metric: `${costSummary.marginPct.toFixed(1)}%` })
    if (costSummary.lossClients > costSummary.profitableClients * 0.5)
      risks.push({ severity: "warning", title: "Убыточные клиенты", description: `${costSummary.lossClients} из ${costSummary.profitableClients + costSummary.lossClients} клиентов убыточны`, metric: `${costSummary.lossClients}` })
    if (slaBreached > 0)
      risks.push({ severity: "critical", title: "Нарушение SLA", description: `${slaBreached} тикетов с истёкшим SLA`, metric: `${slaBreached}` })
    if (overdueTasks > 3)
      risks.push({ severity: "warning", title: "Просроченные задачи", description: `${overdueTasks} задач просрочены`, metric: `${overdueTasks}` })
    if (risks.length === 0)
      risks.push({ severity: "ok", title: "Всё в порядке", description: "Критических проблем не обнаружено", metric: "✓" })

    const totalUsers = companiesAgg._sum.userCount || 0

    // Service labels
    const serviceLabels: Record<string, string> = {
      permanent_it: "Постоянное IT", infosec: "InfoSec", erp: "ERP",
      grc: "GRC", projects: "Проекты", helpdesk: "HelpDesk", cloud: "Облако",
    }

    return NextResponse.json({
      success: true,
      data: {
        financial: {
          monthlyRevenue: costSummary.totalRevenue,
          monthlyCost: costSummary.totalCost,
          monthlyMargin: costSummary.margin,
          marginPct: costSummary.marginPct,
          pipelineValue: pipelineAgg._sum.valueAmount || 0,
          revenueByService: serviceRevenue.map((s: any) => ({
            name: serviceLabels[s.serviceType] || s.serviceType,
            value: s._sum.monthlyRevenue || 0,
          })).filter((s: any) => s.value > 0).sort((a: any, b: any) => b.value - a.value),
        },
        clients: {
          total: companiesCount,
          totalUsers,
          profitable: costSummary.profitableClients,
          loss: costSummary.lossClients,
          noRevenue: companiesCount - costSummary.profitableClients - costSummary.lossClients,
          topClients,
          bottomClients,
        },
        pipeline: {
          deals: activeDeals,
          stages: dealsByStage.map((s: any) => ({
            stage: s.stage, count: s._count, value: s._sum.valueAmount || 0,
          })),
          wonThisMonth,
          wonValue: wonValueAgg._sum.valueAmount || 0,
          lostThisMonth,
        },
        leads: {
          byTemperature: leadsByTemp.map((t: any) => ({
            temp: t.leadTemperature, count: t._count,
          })),
        },
        operations: {
          openTickets,
          criticalTickets,
          slaBreached,
          csatScore: csatAgg._avg.satisfactionRating || 0,
          csatCount: csatAgg._count || 0,
          ticketsByStatus: ticketsByStatus.map((t: any) => ({
            status: t.status, count: t._count,
          })),
        },
        tasks: {
          total: totalTasks,
          overdue: overdueTasks,
          dueThisWeek,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        },
        activity: {
          recent: recentActivities,
          count30d: activityCount30d,
        },
        risks,
      },
    })
  } catch (e) {
    console.error("Executive dashboard error:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
