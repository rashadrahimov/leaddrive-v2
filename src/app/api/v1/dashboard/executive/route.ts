import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { loadAndCompute } from "@/lib/cost-model/db"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
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
      leadsByStatus,
      contractsData,
      wonDealsAll,
      dealsForForecast,
      atRiskDeals,
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
      // Leads by status (for lead funnel)
      prisma.lead.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true }),
      // Contracts for financial overview
      prisma.contract.findMany({
        where: { organizationId: orgId },
        select: { valueAmount: true, status: true },
      }),
      // All won deals (total revenue)
      prisma.deal.findMany({
        where: { organizationId: orgId, stage: "WON" },
        select: { valueAmount: true },
      }),
      // Deals with dates for forecast
      prisma.deal.findMany({
        where: { organizationId: orgId },
        select: { valueAmount: true, stage: true, createdAt: true, updatedAt: true },
      }),
      // At-risk deals (low confidence, active)
      prisma.deal.findMany({
        where: { organizationId: orgId, stage: { notIn: ["WON", "LOST"] } },
        select: {
          id: true, name: true, valueAmount: true, currency: true, stage: true,
          probability: true, confidenceLevel: true, stageChangedAt: true, createdAt: true, contactId: true,
          company: { select: { name: true } },
        },
        orderBy: { valueAmount: "desc" },
      }),
    ])

    // Cost model — direct compute (no internal fetch)
    let costSummary = { totalCost: 0, totalRevenue: 0, margin: 0, marginPct: 0, profitableClients: 0, lossClients: 0 }
    let topClients: any[] = []
    let bottomClients: any[] = []
    try {
      const costResult = await loadAndCompute(orgId)
      costSummary = {
        totalCost: costResult.grandTotalG || 0,
        totalRevenue: costResult.summary?.totalRevenue || 0,
        margin: costResult.summary?.totalMargin || 0,
        marginPct: costResult.summary?.marginPct || 0,
        profitableClients: costResult.summary?.profitableClients || 0,
        lossClients: costResult.summary?.lossClients || 0,
      }
      // Top/bottom clients from cost model
      const sorted = (costResult.clients || []).sort((a: any, b: any) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      topClients = sorted.filter((c: any) => c.totalRevenue > 0).slice(0, 5).map((c: any) => ({
        name: c.name, revenue: c.totalRevenue, margin: c.margin, marginPct: c.marginPct, userCount: c.userCount,
      }))
      bottomClients = sorted.filter((c: any) => c.margin < 0).slice(-3).map((c: any) => ({
        name: c.name, revenue: c.totalRevenue, margin: c.margin, marginPct: c.marginPct, userCount: c.userCount,
      }))
    } catch (err) { console.error(err) }

    // Risks
    const risks: { severity: string; title: string; description: string; metric: string }[] = []
    if (costSummary.marginPct < 5 && costSummary.totalRevenue > 0)
      risks.push({ severity: "critical", title: "Aşağı marja", description: `Marjinallıq ${costSummary.marginPct.toFixed(1)}% — hədəf 15%-dən aşağı`, metric: `${costSummary.marginPct.toFixed(1)}%` })
    if (costSummary.lossClients > costSummary.profitableClients * 0.5)
      risks.push({ severity: "warning", title: "Zərərli müştərilər", description: `${costSummary.profitableClients + costSummary.lossClients} müştəridən ${costSummary.lossClients} zərərli`, metric: `${costSummary.lossClients}` })
    if (slaBreached > 0)
      risks.push({ severity: "critical", title: "SLA pozulub", description: `${slaBreached} biletdə SLA müddəti bitib`, metric: `${slaBreached}` })
    if (overdueTasks > 3)
      risks.push({ severity: "warning", title: "Gecikmiş tapşırıqlar", description: `${overdueTasks} tapşırıq gecikib`, metric: `${overdueTasks}` })
    // At-risk deals (predictive score < 40%)
    const STAGE_PROBABILITY: Record<string, number> = {
      LEAD: 10, QUALIFIED: 20, PROPOSAL: 50, NEGOTIATION: 70, CONTRACT: 85,
    }
    const atRiskList = (atRiskDeals as any[]).map((d: any) => {
      const confidence = d.confidenceLevel ?? 50
      const probability = d.probability ?? (STAGE_PROBABILITY[d.stage] || 30)
      const predictive = Math.round(confidence * 0.85 + probability * 0.15)
      const daysInFunnel = Math.floor((Date.now() - new Date(d.createdAt).getTime()) / 86400000)
      return { ...d, predictive, probability, daysInFunnel }
    }).filter((d: any) => d.predictive < 40)
    .sort((a: any, b: any) => a.predictive - b.predictive)

    if (atRiskList.length > 0)
      risks.push({
        severity: "warning",
        title: "Risk altında müqavilələr",
        description: `${atRiskList.length} müqavilənin proqnoz skoru 40%-dən aşağıdır`,
        metric: `${atRiskList.length}`,
      })

    if (risks.length === 0)
      risks.push({ severity: "ok", title: "Hər şey qaydasındadır", description: "Kritik problem aşkar edilmədi", metric: "✓" })

    const totalUsers = companiesAgg._sum.userCount || 0

    // Financial overview from contracts + deals
    const wonDealsRevenue = wonDealsAll.reduce((s: number, d: any) => s + (d.valueAmount || 0), 0)
    const activeContracts = contractsData.filter((c: any) => c.status === "active" || c.status === "Active")
    const totalContractValue = activeContracts.reduce((s: number, c: any) => s + (c.valueAmount || 0), 0)
    const monthlyContractRevenue = Math.round(totalContractValue / 12)

    // Lead funnel data (with conversion rates)
    const totalLeadCount = leadsByStatus.reduce((s: number, l: any) => s + l._count, 0)
    const leadFunnelOrder = ["new", "contacted", "qualified", "converted", "rejected"]
    const leadFunnelData = leadFunnelOrder.map(status => {
      const item = leadsByStatus.find((l: any) => l.status === status)
      const count = item?._count || 0
      return {
        status,
        count,
        pct: totalLeadCount > 0 ? Math.round((count / totalLeadCount) * 100) : 0,
      }
    }).filter(l => l.count > 0)
    const convertedLeads = leadsByStatus.find((l: any) => l.status === "converted")?._count || 0
    const leadConversionRate = totalLeadCount > 0 ? Math.round((convertedLeads / totalLeadCount) * 100) : 0

    // Sales forecast — last 6 months actual + next 6 projected
    const forecast: { month: string; actual: number; projected: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString("ru", { month: "short" })
      const monthDeals = dealsForForecast.filter((deal: any) => {
        const dd = new Date(deal.updatedAt)
        return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth() && deal.stage === "WON"
      })
      const actual = monthDeals.reduce((s: number, deal: any) => s + (deal.valueAmount || 0), 0)
      forecast.push({ month: label, actual, projected: 0 })
    }
    // Average last 3 months for projection base
    const last3 = forecast.slice(-3).map(f => f.actual)
    const avgMonthly = last3.reduce((a, b) => a + b, 0) / Math.max(1, last3.filter(v => v > 0).length || 1)
    // Add pipeline value distributed over next 6 months
    const pipelineVal = pipelineAgg._sum.valueAmount || 0
    const pipelineMonthly = pipelineVal / 6
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const label = d.toLocaleDateString("ru", { month: "short" })
      forecast.push({ month: label, actual: 0, projected: Math.round(avgMonthly + pipelineMonthly * (1 - i * 0.1)) })
    }

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
          funnel: leadFunnelData,
          total: totalLeadCount,
          conversionRate: leadConversionRate,
        },
        financialOverview: {
          wonDealsRevenue,
          wonDealsCount: wonDealsAll.length,
          avgDealSize: wonDealsAll.length > 0 ? Math.round(wonDealsRevenue / wonDealsAll.length) : 0,
          monthlyContractRevenue,
          totalContracts: contractsData.length,
          activeContracts: activeContracts.length,
          pipelineValue: pipelineAgg._sum.valueAmount || 0,
        },
        forecast,
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
        atRiskDeals: atRiskList.slice(0, 5).map((d: any) => ({
          id: d.id, name: d.name, value: d.valueAmount, currency: d.currency,
          stage: d.stage, predictive: d.predictive, probability: d.probability,
          confidence: d.confidenceLevel ?? 50, daysInFunnel: d.daysInFunnel,
          company: d.company?.name,
        })),
      },
    })
  } catch (e) {
    console.error("Executive dashboard error:", e)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
