import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const [params, overhead, employees, services, companies] = await Promise.all([
      prisma.pricingParameters.findUnique({ where: { organizationId: orgId } }),
      prisma.overheadCost.findMany({ where: { organizationId: orgId }, orderBy: { sortOrder: "asc" } }),
      prisma.costEmployee.findMany({ where: { organizationId: orgId } }),
      prisma.clientService.findMany({ where: { organizationId: orgId, isActive: true }, include: { } }),
      prisma.company.findMany({
        where: { organizationId: orgId, status: "active" },
        select: { id: true, name: true, userCount: true, costCode: true },
      }),
    ])

    // Calculate totals
    const totalOverhead = overhead.reduce((s, o) => {
      const monthly = o.isAnnual ? o.amount / 12 : o.amount
      const withVat = o.hasVat ? monthly * 1.18 : monthly
      return s + withVat
    }, 0)

    const totalEmployeeCost = employees.reduce((s, e) => s + e.superGross * e.count, 0)
    const totalRevenue = services.reduce((s, cs) => s + cs.monthlyRevenue, 0)
    const totalCost = totalOverhead + totalEmployeeCost

    // Service type breakdown
    const serviceTypes = ["permanent_it", "infosec", "helpdesk", "erp", "grc", "projects", "cloud"]
    const serviceRevenues: Record<string, number> = {}
    for (const t of serviceTypes) {
      serviceRevenues[t] = services
        .filter((s) => s.serviceType === t)
        .reduce((sum, s) => sum + s.monthlyRevenue, 0)
    }

    // Employee cost by department
    const deptCosts: Record<string, number> = {}
    for (const e of employees) {
      deptCosts[e.department] = (deptCosts[e.department] || 0) + e.superGross * e.count
    }

    return NextResponse.json({
      success: true,
      data: {
        params,
        summary: {
          totalCost: Math.round(totalCost * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOverhead: Math.round(totalOverhead * 100) / 100,
          totalEmployeeCost: Math.round(totalEmployeeCost * 100) / 100,
          margin: Math.round((totalRevenue - totalCost) * 100) / 100,
          marginPct: totalCost > 0 ? Math.round((totalRevenue - totalCost) / totalCost * 10000) / 100 : 0,
          profitableClients: 0, // TODO: per-client calc
          lossClients: 0,
        },
        overhead,
        employees,
        serviceRevenues,
        deptCosts,
        companies: companies.length,
        services: services.length,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cost model failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
