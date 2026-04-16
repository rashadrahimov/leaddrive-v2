import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { writeMtmAudit } from "@/lib/mtm-audit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const task = await prisma.mtmTask.findFirst({
      where: { id, organizationId: orgId },
      include: {
        agent: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    })
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: task })
  } catch {
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const body = await req.json()
    const updated = await prisma.mtmTask.updateMany({
      where: { id, organizationId: orgId },
      data: {
        title: body.title,
        description: body.description || null,
        agentId: body.agentId,
        customerId: body.customerId || null,
        priority: body.priority || "MEDIUM",
        status: body.status || "PENDING",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        completedAt: body.status === "COMPLETED" ? new Date() : null,
      },
    })
    if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Audit log for task completion — non-blocking
    if (body.status === "COMPLETED" && body.agentId) {
      writeMtmAudit({
        organizationId: orgId,
        agentId: body.agentId,
        action: "TASK_COMPLETE",
        entity: "task",
        entityId: id,
        newData: { title: body.title, customerId: body.customerId },
        req,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update" }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const deleted = await prisma.mtmTask.deleteMany({ where: { id, organizationId: orgId } })
    if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete" }, { status: 400 })
  }
}
