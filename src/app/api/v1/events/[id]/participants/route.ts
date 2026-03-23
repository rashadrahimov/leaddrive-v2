import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const addSchema = z.object({
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().default("attendee"),
  status: z.string().default("registered"),
  notes: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  const participants = await prisma.eventParticipant.findMany({
    where: { eventId: id },
    orderBy: { registeredAt: "desc" },
  })

  return NextResponse.json({ success: true, data: participants })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  const body = await req.json()

  // Support bulk add (array of participants)
  const items = Array.isArray(body) ? body : [body]
  const created = []

  for (const item of items) {
    const parsed = addSchema.safeParse(item)
    if (!parsed.success) continue

    const participant = await prisma.eventParticipant.create({
      data: { ...parsed.data, eventId: id },
    })
    created.push(participant)
  }

  // Update registered count
  const count = await prisma.eventParticipant.count({ where: { eventId: id } })
  await prisma.event.updateMany({
    where: { id, organizationId: orgId },
    data: { registeredCount: count },
  })

  return NextResponse.json({ success: true, data: created }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { participantId } = await req.json()
  if (!participantId) return NextResponse.json({ error: "participantId required" }, { status: 400 })

  await prisma.eventParticipant.delete({ where: { id: participantId } })

  const count = await prisma.eventParticipant.count({ where: { eventId: id } })
  await prisma.event.updateMany({
    where: { id, organizationId: orgId },
    data: { registeredCount: count },
  })

  return NextResponse.json({ success: true })
}
