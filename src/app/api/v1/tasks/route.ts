import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { executeWorkflows } from "@/lib/workflow-engine"

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
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const assignedTo = searchParams.get("assignedTo") || ""
  const status = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const where = {
      organizationId: orgId,
      ...(assignedTo ? { assignedTo } : {}),
      ...(status ? { status } : {}),
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dueDate: "asc" },
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { tasks, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { tasks: [], total: 0, page, limit } })
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
    executeWorkflows(orgId, "task", "created", task).catch(() => {})
    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
