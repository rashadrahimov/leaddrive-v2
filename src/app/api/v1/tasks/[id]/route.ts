import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession, requireAuth, isAuthError } from "@/lib/api-auth"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"

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
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const { id } = await params

  const task = await prisma.task.findFirst({
    where: { id, organizationId: orgId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true } },
      checklist: { orderBy: { sortOrder: "asc" } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
    },
  })
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Resolve related entity name
  let relatedName = ""
  if (task.relatedType && task.relatedId) {
    try {
      switch (task.relatedType) {
        case "company": { const e = await prisma.company.findUnique({ where: { id: task.relatedId }, select: { name: true } }); relatedName = e?.name || ""; break }
        case "contact": { const e = await prisma.contact.findUnique({ where: { id: task.relatedId }, select: { fullName: true, name: true } }); relatedName = (e as any)?.fullName || e?.name || ""; break }
        case "deal": { const e = await prisma.deal.findUnique({ where: { id: task.relatedId }, select: { title: true } }); relatedName = e?.title || ""; break }
        case "lead": { const e = await prisma.lead.findUnique({ where: { id: task.relatedId }, select: { contactName: true, companyName: true } }); relatedName = e?.contactName || e?.companyName || ""; break }
        case "ticket": { const e = await prisma.ticket.findUnique({ where: { id: task.relatedId }, select: { subject: true } }); relatedName = e?.subject || ""; break }
      }
    } catch {}
  }

  const fieldPerms = await getFieldPermissions(orgId, role, "task")
  const filteredTask = filterEntityFields({ ...task, relatedName }, fieldPerms, role)
  return NextResponse.json({ success: true, data: filteredTask })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, "tasks", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const { id } = await params

  const existing = await prisma.task.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const session = await getSession(req)
  const role = session?.role || "admin"
  const body = await req.json()
  const fieldPerms = await getFieldPermissions(orgId, role, "task")
  const filteredBody = filterWritableFields(body, fieldPerms, role)
  const parsed = updateTaskSchema.safeParse(filteredBody)
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
        title: "Task Completed",
        message: `Task completed: "${task.title}"`,
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
