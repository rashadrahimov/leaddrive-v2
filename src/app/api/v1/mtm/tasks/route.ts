import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || ""
  const status = searchParams.get("status") || ""
  const priority = searchParams.get("priority") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (agentId) where.agentId = agentId
    if (status) where.status = status
    if (priority) where.priority = priority

    const [tasks, total] = await Promise.all([
      prisma.mtmTask.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.mtmTask.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { tasks, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { tasks: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const task = await prisma.mtmTask.create({
      data: {
        organizationId: orgId,
        agentId: body.agentId,
        customerId: body.customerId || null,
        visitId: body.visitId || null,
        title: body.title,
        description: body.description || null,
        priority: body.priority || "MEDIUM",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
    })
    return NextResponse.json({ success: true, data: task }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create task" }, { status: 400 })
  }
}
