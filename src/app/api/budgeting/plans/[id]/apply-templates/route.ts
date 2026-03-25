import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: planId } = await params

  const body = await req.json()
  const { templateIds } = body as { templateIds: string[] }

  if (!templateIds?.length) return NextResponse.json({ error: "templateIds required" }, { status: 400 })

  // Verify plan exists
  const plan = await prisma.budgetPlan.findFirst({ where: { id: planId, organizationId: orgId } })
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  // Get templates
  const templates = await prisma.budgetDirectionTemplate.findMany({
    where: { id: { in: templateIds }, organizationId: orgId, isActive: true },
  })

  // Get existing line categories in this plan to skip duplicates
  const existingLines = await prisma.budgetLine.findMany({
    where: { planId, organizationId: orgId },
    select: { category: true, lineType: true },
  })
  const existingKeys = new Set(existingLines.map((l: { category: string; lineType: string }) => `${l.category}||${l.lineType}`))

  let created = 0
  let skipped = 0

  for (const t of templates) {
    const key = `${t.name}||${t.lineType}`
    if (existingKeys.has(key)) {
      skipped++
      continue
    }

    await prisma.budgetLine.create({
      data: {
        organizationId: orgId,
        planId,
        category: t.name,
        department: t.department,
        lineType: t.lineType,
        lineSubtype: t.lineSubtype,
        plannedAmount: t.defaultAmount,
        unitPrice: t.unitPrice,
        unitCost: t.unitCost,
        quantity: t.quantity,
        costModelKey: t.costModelKey,
        notes: `template:${t.id}`,
      },
    })
    created++
  }

  return NextResponse.json({ data: { created, skipped } })
}
