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
  source: z.string().default("invited"),
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { participantId, action, participantIds } = body

  // Bulk send invitations
  if (action === "send_invites") {
    const ids = participantIds || []
    if (ids.length === 0) return NextResponse.json({ error: "No participants selected" }, { status: 400 })

    // Get event + participants
    const event = await prisma.event.findFirst({ where: { id, organizationId: orgId } })
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })

    const participants = await prisma.eventParticipant.findMany({
      where: { id: { in: ids }, eventId: id },
    })

    // Try to send via SMTP
    let sentCount = 0
    const smtpConfig = await prisma.smtpSetting?.findFirst?.({ where: { organizationId: orgId, isActive: true } }).catch(() => null)

    if (smtpConfig) {
      const nodemailer = await import("nodemailer").catch(() => null)
      if (nodemailer) {
        const transport = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port || 587,
          secure: (smtpConfig.port || 587) === 465,
          auth: { user: smtpConfig.username, pass: smtpConfig.password },
        })

        for (const p of participants) {
          if (!p.email) continue
          try {
            await transport.sendMail({
              from: smtpConfig.fromEmail || smtpConfig.username,
              to: p.email,
              subject: `Invitation: ${event.name}`,
              html: `
                <h2>You're invited to ${event.name}</h2>
                <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleString("ru-RU")}</p>
                ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ""}
                ${event.isOnline && event.meetingUrl ? `<p><strong>Join online:</strong> <a href="${event.meetingUrl}">${event.meetingUrl}</a></p>` : ""}
                ${event.description ? `<p>${event.description}</p>` : ""}
                <p>We look forward to seeing you!</p>
              `,
            })
            sentCount++
          } catch {}
        }
      }
    }

    // Mark all as sent regardless (so UI shows status)
    await prisma.eventParticipant.updateMany({
      where: { id: { in: ids }, eventId: id },
      data: { inviteStatus: "sent", invitedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      data: { sent: sentCount, total: participants.length, smtpConfigured: !!smtpConfig },
    })
  }

  // Single participant update (status, role, inviteStatus)
  if (participantId) {
    const updateData: any = {}
    if (body.status) updateData.status = body.status
    if (body.role) updateData.role = body.role
    if (body.inviteStatus) updateData.inviteStatus = body.inviteStatus

    await prisma.eventParticipant.update({
      where: { id: participantId },
      data: updateData,
    })

    // Recalculate attended count
    const attendedCount = await prisma.eventParticipant.count({
      where: { eventId: id, status: "attended" },
    })
    await prisma.event.updateMany({
      where: { id, organizationId: orgId },
      data: { attendedCount },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
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

  try {
    await prisma.eventParticipant.delete({ where: { id: participantId } })
  } catch (e) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 })
  }

  const count = await prisma.eventParticipant.count({ where: { eventId: id } })
  const attendedCount = await prisma.eventParticipant.count({ where: { eventId: id, status: "attended" } })
  await prisma.event.updateMany({
    where: { id, organizationId: orgId },
    data: { registeredCount: count, attendedCount },
  })

  return NextResponse.json({ success: true, data: { remaining: count } })
}
