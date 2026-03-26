import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// POST — generate cash flow entries from budget lines, invoices, contracts
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { year, planId } = await req.json()
  if (!year) return NextResponse.json({ error: "year required" }, { status: 400 })

  let created = 0

  // 1. From budget lines (planned expenses → outflows, planned revenue → inflows)
  if (planId) {
    const lines = await prisma.budgetLine.findMany({
      where: { planId, organizationId: orgId },
    })

    const plan = await prisma.budgetPlan.findFirst({
      where: { id: planId, organizationId: orgId },
    })

    if (plan) {
      // Determine months for this plan
      const months: number[] = []
      if (plan.periodType === "annual") {
        for (let m = 1; m <= 12; m++) months.push(m)
      } else if (plan.periodType === "quarterly" && plan.quarter) {
        const startMonth = (plan.quarter - 1) * 3 + 1
        for (let m = startMonth; m < startMonth + 3; m++) months.push(m)
      } else if (plan.month) {
        months.push(plan.month)
      }

      for (const line of lines) {
        const monthlyAmount = line.plannedAmount / (months.length || 1)
        const entryType = line.lineType === "revenue" ? "inflow" : "outflow"

        for (const m of months) {
          // Check if entry already exists
          const existing = await prisma.cashFlowEntry.findFirst({
            where: {
              organizationId: orgId,
              year: plan.year,
              month: m,
              source: "budget_line",
              sourceId: line.id,
            },
          })

          if (!existing) {
            await prisma.cashFlowEntry.create({
              data: {
                organizationId: orgId,
                year: plan.year,
                month: m,
                entryType,
                source: "budget_line",
                sourceId: line.id,
                amount: monthlyAmount,
                description: `${line.category} (${line.lineType})`,
                isProjected: true,
              },
            })
            created++
          }
        }
      }
    }
  }

  // 2. From invoices (sent/partially_paid → projected inflows)
  try {
    const invoices = await (prisma as any).invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["sent", "partially_paid"] },
      },
    })

    for (const inv of invoices) {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date()
      if (dueDate.getFullYear() !== year) continue

      const existing = await prisma.cashFlowEntry.findFirst({
        where: {
          organizationId: orgId,
          source: "invoice",
          sourceId: inv.id,
        },
      })

      if (!existing) {
        await prisma.cashFlowEntry.create({
          data: {
            organizationId: orgId,
            year,
            month: dueDate.getMonth() + 1,
            entryType: "inflow",
            source: "invoice",
            sourceId: inv.id,
            amount: inv.totalAmount || inv.amount || 0,
            description: `Invoice #${inv.number || inv.id.substring(0, 8)}`,
            paymentDate: dueDate,
            isProjected: true,
          },
        })
        created++
      }
    }
  } catch {
    // Invoice model may not exist — skip silently
  }

  // 3. Generate alerts for negative closing balances
  const entries = await prisma.cashFlowEntry.findMany({
    where: { organizationId: orgId, year },
    orderBy: [{ month: "asc" }],
  })

  let balance = 0
  for (let m = 1; m <= 12; m++) {
    const monthEntries = entries.filter((e) => e.month === m)
    const inflows = monthEntries.filter((e) => e.entryType === "inflow").reduce((s, e) => s + e.amount, 0)
    const outflows = monthEntries.filter((e) => e.entryType === "outflow").reduce((s, e) => s + e.amount, 0)
    balance = balance + inflows - outflows

    if (balance < 0) {
      // Check if alert already exists
      const existingAlert = await prisma.cashFlowAlert.findFirst({
        where: { organizationId: orgId, year, month: m, alertType: "negative_balance", isResolved: false },
      })

      if (!existingAlert) {
        await prisma.cashFlowAlert.create({
          data: {
            organizationId: orgId,
            year,
            month: m,
            alertType: "negative_balance",
            message: `Projected negative balance of ${balance.toFixed(0)} in month ${m}/${year}`,
            projectedBalance: balance,
          },
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    entriesCreated: created,
    year,
  })
}
