import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
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
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = updateTaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Fetch original to detect changes
    const original = await prisma.task.findFirst({ where: { id, organizationId: orgId } })
    if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 })

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

    // Notify on assignee change
    if (parsed.data.assignedTo && parsed.data.assignedTo !== original.assignedTo) {
      createNotification({
        organizationId: orgId,
        userId: parsed.data.assignedTo,
        type: "info",
        title: `Tapşırıq sizə təyin edildi: ${task.title}`,
        message: `${task.priority} prioritet`,
        entityType: "task",
        entityId: id,
      }).catch(() => {})
    }

    // Notify on task completed (org-wide)
    if (parsed.data.status === "completed" && original.status !== "completed") {
      createNotification({
        organizationId: orgId,
        userId: "",
        type: "success",
        title: `Tapşırıq tamamlandı: ${task.title}`,
        message: original.assignedTo ? `Təyin edilən tərəfindən tamamlandı` : "",
        entityType: "task",
        entityId: id,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, data: task })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
