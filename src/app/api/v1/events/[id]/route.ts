import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().optional(),
  meetingUrl: z.string().optional(),
  budget: z.number().optional(),
  actualCost: z.number().optional(),
  expectedRevenue: z.number().optional(),
  actualRevenue: z.number().optional(),
  maxParticipants: z.number().optional(),
  registeredCount: z.number().optional(),
  attendedCount: z.number().optional(),
  responsibleId: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id, organizationId: orgId },
    include: { participants: { orderBy: { registeredAt: "desc" } } },
  })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: event })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const data: any = { ...parsed.data }
  if (data.startDate) data.startDate = new Date(data.startDate)
  if (data.endDate) data.endDate = new Date(data.endDate)

  const result = await prisma.event.updateMany({
    where: { id, organizationId: orgId },
    data,
  })
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.event.findFirst({ where: { id, organizationId: orgId } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const result = await prisma.event.deleteMany({ where: { id, organizationId: orgId } })
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: { deleted: id } })
}
