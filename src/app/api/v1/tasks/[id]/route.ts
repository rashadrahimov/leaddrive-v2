import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"

const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["pending", "todo", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  relatedType: z.string().nullable().optional(),
  relatedId: z.string().nullable().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const task = await prisma.task.findFirst({ where: { id, organizationId: orgId } })
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: task })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, "tasks", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const { id } = await params

  const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const data: any = { ...parsed.data }
    if (data.dueDate !== undefined) {
      data.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }
    if (data.status === "completed") {
      data.completedAt = new Date()
    }

    const task = await prisma.task.update({
      where: { id },
      data,
    })
    logAudit(orgId, "update", "task", id, task.title, { newValue: parsed.data })
    const triggerEvent = parsed.data.status ? "status_changed" : "updated"
    executeWorkflows(orgId, "task", triggerEvent, task).catch(() => {})
    if (parsed.data.status === "completed") {
      createNotification({
        organizationId: orgId,
        type: "success",
        title: "Задача выполнена",
        message: `Задача «${task.title}» завершена`,
        entityType: "task",
        entityId: id,
      }).catch(() => {})
    }
    return NextResponse.json({ success: true, data: task })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, "tasks", "delete")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const { id } = await params

  try {
    const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId }, select: { title: true } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    await prisma.task.deleteMany({ where: { id, organizationId: orgId } })
    logAudit(orgId, "delete", "task", id, existing?.title || "")
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
