import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  entityType: z.string().optional(),
  triggerEvent: z.string().optional(),
  conditions: z.any().optional(),
  isActive: z.boolean().optional(),
  actions: z.array(z.object({
    actionType: z.string().min(1),
    actionConfig: z.any().optional().default({}),
    actionOrder: z.number().int().min(0).optional().default(0),
  })).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const rule = await prisma.workflowRule.findFirst({
      where: { id, organizationId: orgId },
      include: { actions: { orderBy: { actionOrder: "asc" } } },
    })
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: rule })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateWorkflowSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { actions, ...ruleData } = parsed.data

  try {
    if (actions !== undefined) {
      // Transactional: update rule + replace all actions
      await prisma.$transaction(async (tx) => {
        // Update rule fields if any
        if (Object.keys(ruleData).length > 0) {
          await tx.workflowRule.updateMany({
            where: { id, organizationId: orgId },
            data: ruleData,
          })
        }
        // Delete existing actions
        await tx.workflowAction.deleteMany({ where: { ruleId: id } })
        // Create new actions
        if (actions.length > 0) {
          await tx.workflowAction.createMany({
            data: actions.map((a, i) => ({
              ruleId: id,
              actionType: a.actionType,
              actionConfig: a.actionConfig || {},
              actionOrder: a.actionOrder ?? i,
            })),
          })
        }
      })
    } else {
      // Just update rule fields
      const result = await prisma.workflowRule.updateMany({
        where: { id, organizationId: orgId },
        data: ruleData,
      })
      if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const updated = await prisma.workflowRule.findFirst({
      where: { id, organizationId: orgId },
      include: { actions: { orderBy: { actionOrder: "asc" } } },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    await prisma.workflowAction.deleteMany({ where: { ruleId: id } })
    const result = await prisma.workflowRule.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
