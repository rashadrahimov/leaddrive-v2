import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createStepSchema = z.object({
  title: z.string().min(1).max(300),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const tasks = await prisma.task.findMany({
      where: { organizationId: orgId, relatedType: "deal", relatedId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })
    return NextResponse.json({ success: true, data: tasks })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = createStepSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const task = await prisma.task.create({
      data: {
        organizationId: orgId,
        title: parsed.data.title,
        relatedType: "deal",
        relatedId: id,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        assignedTo: parsed.data.assignedTo || null,
        status: "pending",
      },
    })
    return NextResponse.json({ success: true, data: task })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { taskId, status } = await req.json()
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 })

  try {
    await prisma.task.updateMany({
      where: { id: taskId, organizationId: orgId },
      data: {
        status: status || "completed",
        completedAt: status === "completed" ? new Date() : null,
      },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
