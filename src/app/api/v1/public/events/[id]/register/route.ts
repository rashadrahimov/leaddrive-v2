import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

// GET — public event info (no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const event = await prisma.event.findFirst({
    where: { id },
    select: {
      id: true, name: true, description: true, type: true, status: true,
      startDate: true, endDate: true, location: true, isOnline: true,
      meetingUrl: true, maxParticipants: true, registeredCount: true, tags: true,
    },
  })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  // Only allow registration for open events
  const canRegister = ["planned", "registration_open"].includes(event.status)
  const isFull = event.maxParticipants ? event.registeredCount >= event.maxParticipants : false

  return NextResponse.json({
    success: true,
    data: { ...event, canRegister, isFull },
  })
}

// POST — self-register for event (no auth required)
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  role: z.string().default("attendee"),
  notes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const event = await prisma.event.findFirst({ where: { id } })
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

  if (!["planned", "registration_open"].includes(event.status)) {
    return NextResponse.json({ error: "Registration is closed for this event" }, { status: 400 })
  }

  if (event.maxParticipants && event.registeredCount >= event.maxParticipants) {
    return NextResponse.json({ error: "Event is full" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  // Check if already exists (invited or registered)
  const existing = await prisma.eventParticipant.findFirst({
    where: { eventId: id, email: parsed.data.email },
  })
  if (existing) {
    // Already invited — confirm attendance
    if (existing.status === "registered" || existing.inviteStatus === "sent") {
      await prisma.eventParticipant.update({
        where: { id: existing.id },
        data: {
          status: "confirmed",
          name: parsed.data.name || existing.name,
          phone: parsed.data.phone || existing.phone,
          notes: parsed.data.company ? `Company: ${parsed.data.company}` : existing.notes,
        },
      })
      return NextResponse.json({
        success: true,
        data: { id: existing.id, message: "Attendance confirmed!" },
      })
    }
    // Already confirmed/attended
    return NextResponse.json({ error: "You are already registered for this event" }, { status: 409 })
  }

  // Try to find existing CRM contact by email
  const contact = await prisma.contact.findFirst({
    where: { organizationId: event.organizationId, email: parsed.data.email },
  })

  const participant = await prisma.eventParticipant.create({
    data: {
      eventId: id,
      contactId: contact?.id,
      companyId: contact?.companyId || undefined,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || undefined,
      role: parsed.data.role,
      status: "confirmed",
      source: "self_registered",
      notes: parsed.data.company ? `Company: ${parsed.data.company}` : parsed.data.notes,
    },
  })

  // Update count
  const count = await prisma.eventParticipant.count({ where: { eventId: id } })
  await prisma.event.updateMany({
    where: { id },
    data: { registeredCount: count },
  })

  return NextResponse.json({
    success: true,
    data: { id: participant.id, message: "Registration successful!" },
  }, { status: 201 })
}
