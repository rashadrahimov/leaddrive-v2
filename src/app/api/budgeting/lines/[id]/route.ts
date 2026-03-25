import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { category, department, lineType, plannedAmount, forecastAmount, costModelKey, isAutoActual, notes } = body

  const result = await prisma.budgetLine.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...(category !== undefined && { category }),
      ...(department !== undefined && { department }),
      ...(lineType !== undefined && { lineType }),
      ...(plannedAmount !== undefined && { plannedAmount: Number(plannedAmount) }),
      ...(forecastAmount !== undefined && { forecastAmount: forecastAmount != null ? Number(forecastAmount) : null }),
      ...(costModelKey !== undefined && { costModelKey: costModelKey || null }),
      ...(isAutoActual !== undefined && { isAutoActual: Boolean(isAutoActual) }),
      ...(notes !== undefined && { notes }),
    },
  })

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.budgetLine.findFirst({ where: { id, organizationId: orgId } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  await prisma.budgetLine.deleteMany({ where: { id, organizationId: orgId } })

  return NextResponse.json({ success: true, data: null })
}
