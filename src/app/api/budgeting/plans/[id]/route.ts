import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { loadAndCompute } from "@/lib/cost-model/db"
import { computePlannedForLine, getPeriodMonths } from "@/lib/budgeting/cost-model-map"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const plan = await prisma.budgetPlan.findFirst({
    where: { id, organizationId: orgId },
    include: { lines: true, actuals: true },
  })

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: plan })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, status, notes, rejectedReason } = body

  // Build update data with approval workflow fields
  const updateData: Record<string, any> = {}
  if (name !== undefined) updateData.name = name
  if (notes !== undefined) updateData.notes = notes
  if (status !== undefined) {
    updateData.status = status
    if (status === "pending_approval") {
      updateData.submittedAt = new Date()
      updateData.submittedBy = req.headers.get("x-user-id") || "unknown"
    }
    if (status === "approved") {
      updateData.approvedAt = new Date()
      updateData.approvedBy = req.headers.get("x-user-id") || "admin"
    }
    if (status === "rejected") {
      updateData.rejectedReason = rejectedReason || null
    }
    if (status === "draft") {
      // Reset approval fields when reverting to draft
      updateData.submittedAt = null
      updateData.submittedBy = null
      updateData.approvedAt = null
      updateData.approvedBy = null
      updateData.rejectedReason = null
    }
  }

  const plan = await prisma.budgetPlan.updateMany({
    where: { id, organizationId: orgId },
    data: updateData,
  })

  if (plan.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.budgetPlan.findFirst({ where: { id, organizationId: orgId } })

  // Freeze auto-planned values when plan is approved
  if (status === "approved") {
    const planData = await prisma.budgetPlan.findFirst({ where: { id, organizationId: orgId } })
    if (planData) {
      const autoLines = await prisma.budgetLine.findMany({
        where: { planId: id, organizationId: orgId, isAutoPlanned: true },
      })
      if (autoLines.length > 0) {
        const cm = await loadAndCompute(orgId).catch(() => null)
        const { count, months } = getPeriodMonths(planData)
        const [forecasts, expForecasts] = await Promise.all([
          prisma.salesForecast.findMany({
            where: { organizationId: orgId, year: planData.year, month: { in: months } },
          }),
          prisma.expenseForecast.findMany({
            where: { organizationId: orgId, year: planData.year, month: { in: months } },
          }),
        ])
        for (const line of autoLines) {
          const computed = computePlannedForLine(line, cm, forecasts, count, months, expForecasts)
          await prisma.budgetLine.update({
            where: { id: line.id },
            data: { plannedAmount: Math.round(computed * 100) / 100, isAutoPlanned: false },
          })
        }
      }
    }
  }

  // P4-10: Send notifications when plan is approved
  if (status === "approved" && updated) {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    })
    for (const user of users) {
      await createNotification({
        organizationId: orgId,
        userId: user.id,
        type: "success",
        title: "Бюджет утверждён",
        message: `План "${updated.name}" утверждён`,
        entityType: "budget_plan",
        entityId: id,
      })
    }
  }

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  await prisma.budgetPlan.deleteMany({ where: { id, organizationId: orgId } })

  return NextResponse.json({ success: true, data: null })
}
