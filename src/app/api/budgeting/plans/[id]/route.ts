import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

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
  const { name, status, notes } = body

  const plan = await prisma.budgetPlan.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...(name !== undefined && { name }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
  })

  if (plan.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.budgetPlan.findFirst({ where: { id, organizationId: orgId } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  await prisma.budgetPlan.deleteMany({ where: { id, organizationId: orgId } })

  return NextResponse.json({ success: true, data: null })
}
