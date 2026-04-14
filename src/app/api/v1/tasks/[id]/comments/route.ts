import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: taskId } = await params

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: orgId }, select: { id: true } })
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

  const comments = await prisma.taskComment.findMany({
    where: { taskId, organizationId: orgId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json({ success: true, data: comments })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: taskId } = await params

  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId: orgId }, select: { id: true } })
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 })

  const body = await req.json()
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const comment = await prisma.taskComment.create({
    data: {
      organizationId: orgId,
      taskId,
      userId: session?.userId || null,
      content: parsed.data.content,
    },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json({ success: true, data: comment }, { status: 201 })
}
