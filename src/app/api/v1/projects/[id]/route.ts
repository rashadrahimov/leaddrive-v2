import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().max(50).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["planning", "active", "on_hold", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.number().optional(),
  actualCost: z.number().optional(),
  currency: z.string().optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  managerId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await props.params

  try {
    const project = await prisma.project.findFirst({
      where: { id, organizationId: orgId },
      include: {
        company: { select: { id: true, name: true } },
        members: { where: { organizationId: orgId } },
        milestones: { where: { organizationId: orgId }, orderBy: { sortOrder: "asc" } },
        tasks: {
          where: { organizationId: orgId },
          orderBy: { sortOrder: "asc" },
          include: {
            milestone: { select: { id: true, name: true, color: true } },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: project })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await props.params
  const body = await req.json()
  const parsed = updateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.startDate !== undefined) {
      data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null
    }
    if (parsed.data.endDate !== undefined) {
      data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
    }
    if (parsed.data.status === "completed" && !data.actualEndDate) {
      data.actualEndDate = new Date()
      data.completionPercentage = 100
    }
    if (parsed.data.status === "active" && !data.actualStartDate) {
      data.actualStartDate = new Date()
    }

    const project = await prisma.project.update({
      where: { id, organizationId: orgId },
      data,
    })

    return NextResponse.json({ success: true, data: project })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await props.params

  try {
    await prisma.project.delete({
      where: { id, organizationId: orgId },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
