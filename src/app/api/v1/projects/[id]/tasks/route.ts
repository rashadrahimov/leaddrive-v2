import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  milestoneId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.number().optional(),
  tags: z.array(z.string()).optional(),
})

const updateTaskSchema = createTaskSchema.partial().extend({
  actualHours: z.number().optional(),
  sortOrder: z.number().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await props.params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const milestoneId = searchParams.get("milestoneId")
  const assignedTo = searchParams.get("assignedTo")

  try {
    const tasks = await prisma.projectTask.findMany({
      where: {
        projectId,
        organizationId: orgId,
        ...(status ? { status } : {}),
        ...(milestoneId ? { milestoneId } : {}),
        ...(assignedTo ? { assignedTo } : {}),
      },
      orderBy: { sortOrder: "asc" },
      include: {
        milestone: { select: { id: true, name: true, color: true } },
        children: { select: { id: true, title: true, status: true } },
      },
    })
    return NextResponse.json({ success: true, data: tasks })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await props.params
  const body = await req.json()
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const task = await prisma.projectTask.create({
      data: {
        organizationId: orgId,
        projectId,
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      },
    })
    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await props.params
  const body = await req.json()
  const { taskId, ...rest } = body

  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 })
  }

  const parsed = updateTaskSchema.safeParse(rest)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.dueDate !== undefined) {
      data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null
    }
    if (parsed.data.status === "done") {
      data.completedAt = new Date()
    }

    const task = await prisma.projectTask.update({
      where: { id: taskId, projectId, organizationId: orgId },
      data,
    })

    // Auto-update project completion percentage
    const [totalTasks, doneTasks] = await Promise.all([
      prisma.projectTask.count({ where: { projectId, organizationId: orgId } }),
      prisma.projectTask.count({ where: { projectId, organizationId: orgId, status: "done" } }),
    ])
    if (totalTasks > 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: { completionPercentage: Math.round((doneTasks / totalTasks) * 100) },
      })
    }

    return NextResponse.json({ success: true, data: task })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await props.params
  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get("taskId")

  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 })
  }

  try {
    await prisma.projectTask.delete({
      where: { id: taskId, projectId, organizationId: orgId },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
