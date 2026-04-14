import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"

const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const { searchParams } = new URL(req.url)
  const assignedTo = searchParams.get("assignedTo") || ""
  const status = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > 200) {
    return NextResponse.json({ error: "Invalid page or limit" }, { status: 400 })
  }

  try {
    let where: any = {
      organizationId: orgId,
      ...(assignedTo ? { assignedTo } : {}),
      ...(status ? { status } : {}),
    }
    where = await applyRecordFilter(orgId, session?.userId || "", role, "task", where)

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dueDate: "asc" },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
          creator: { select: { id: true, name: true } },
          _count: { select: { checklist: true, comments: true } },
        },
      }),
      prisma.task.count({ where }),
    ])

    // Resolve related entity names
    const tasksWithNames = await Promise.all(tasks.map(async (t: any) => {
      if (!t.relatedType || !t.relatedId) return t
      try {
        let relatedName = ""
        switch (t.relatedType) {
          case "company": { const e = await prisma.company.findUnique({ where: { id: t.relatedId }, select: { name: true } }); relatedName = e?.name || ""; break }
          case "contact": { const e = await prisma.contact.findUnique({ where: { id: t.relatedId }, select: { fullName: true, name: true } }); relatedName = e?.fullName || e?.name || ""; break }
          case "deal": { const e = await prisma.deal.findUnique({ where: { id: t.relatedId }, select: { title: true } }); relatedName = e?.title || ""; break }
          case "lead": { const e = await prisma.lead.findUnique({ where: { id: t.relatedId }, select: { contactName: true, companyName: true } }); relatedName = e?.contactName || e?.companyName || ""; break }
          case "ticket": { const e = await prisma.ticket.findUnique({ where: { id: t.relatedId }, select: { subject: true } }); relatedName = e?.subject || ""; break }
        }
        return { ...t, relatedName }
      } catch { return t }
    }))

    const fieldPerms = await getFieldPermissions(orgId, role, "task")
    const filteredTasks = tasksWithNames.map((t: any) => filterEntityFields(t, fieldPerms, role))

    return NextResponse.json({ success: true, data: { tasks: filteredTasks, total, page, limit } })
  } catch (e) {
    console.error("[Tasks GET]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const task = await prisma.task.create({
      data: {
        organizationId: orgId,
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status || "pending",
        priority: parsed.data.priority || "medium",
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        assignedTo: parsed.data.assignedTo,
        relatedType: parsed.data.relatedType,
        relatedId: parsed.data.relatedId,
      },
    })
    logAudit(orgId, "create", "task", task.id, task.title)
    executeWorkflows(orgId, "task", "created", task).catch(() => {})
    createNotification({
      organizationId: orgId,
      userId: task.assignedTo || "",
      type: task.priority === "urgent" ? "warning" : "info",
      title: "New Task",
      message: `Task created: "${task.title}"${task.priority === "urgent" ? " (URGENT)" : ""}`,
      entityType: "task",
      entityId: task.id,
    }).catch(() => {})
    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
