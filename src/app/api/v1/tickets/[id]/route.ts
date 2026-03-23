import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { executeWorkflows } from "@/lib/workflow-engine"

const updateTicketSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["new", "in_progress", "waiting", "resolved", "closed"]).optional(),
  assignedTo: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  category: z.enum(["general", "technical", "billing", "feature_request"]).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: { comments: { orderBy: { createdAt: "asc" } } },
    })

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    // Resolve user names for comments, assignee, company
    const userIds = [...new Set([
      ...ticket.comments.map(c => c.userId).filter(Boolean),
      ticket.assignedTo,
      ticket.createdBy,
    ].filter(Boolean))] as string[]

    const [users, company, contact] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : Promise.resolve([]),
      ticket.companyId
        ? prisma.company.findFirst({ where: { id: ticket.companyId }, select: { id: true, name: true } })
        : Promise.resolve(null),
      ticket.contactId
        ? prisma.contact.findFirst({ where: { id: ticket.contactId }, select: { id: true, fullName: true, email: true } })
        : Promise.resolve(null),
    ])

    const userMap = Object.fromEntries(users.map(u => [u.id, u.name || u.email]))

    const contactName = contact?.fullName || contact?.email || "Клиент"

    const enrichedComments = ticket.comments.map(c => ({
      ...c,
      userName: c.userId ? userMap[c.userId] || "Support" : contactName,
    }))

    return NextResponse.json({
      success: true,
      data: {
        ...ticket,
        comments: enrichedComments,
        assigneeName: ticket.assignedTo ? userMap[ticket.assignedTo] || ticket.assignedTo : null,
        companyName: company?.name || null,
        contactName: contactName !== "Клиент" ? contactName : null,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateTicketSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Fetch original ticket to detect status change
    const original = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!original) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    const oldStatus = original.status

    await prisma.ticket.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...(parsed.data.subject && { subject: parsed.data.subject }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.priority && { priority: parsed.data.priority }),
        ...(parsed.data.status && { status: parsed.data.status }),
        ...(parsed.data.assignedTo !== undefined && { assignedTo: parsed.data.assignedTo || null }),
        ...(parsed.data.contactId !== undefined && { contactId: parsed.data.contactId || null }),
        ...(parsed.data.companyId !== undefined && { companyId: parsed.data.companyId || null }),
        ...(parsed.data.category && { category: parsed.data.category }),
        ...(parsed.data.status === "resolved" && { resolvedAt: new Date() }),
        ...(parsed.data.status === "closed" && { closedAt: new Date() }),
      },
    })

    const updated = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: { comments: { orderBy: { createdAt: "desc" } } },
    })

    // Send WhatsApp notification on status change for WhatsApp tickets
    const newStatus = parsed.data.status
    if (newStatus && newStatus !== oldStatus && (original.tags as string[])?.includes("whatsapp")) {
      sendWhatsAppStatusNotification(orgId, original, newStatus).catch(err =>
        console.error("[Ticket WA] Status notification error:", err)
      )
    }

    logAudit(orgId, "update", "ticket", id, original.subject, { newValue: parsed.data })
    if (updated) {
      const triggerEvent = parsed.data.status ? "status_changed" : "updated"
      executeWorkflows(orgId, "ticket", triggerEvent, updated).catch(() => {})
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const existing = await prisma.ticket.findFirst({ where: { id, organizationId: orgId }, select: { subject: true } })
    const result = await prisma.ticket.deleteMany({
      where: { id, organizationId: orgId },
    })

    if (result.count === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    logAudit(orgId, "delete", "ticket", id, existing?.subject || "")
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PATCH /api/v1/tickets/[id] — auto-assign to least loaded agent
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    // Find agents in this org
    const users = await prisma.user.findMany({
      where: { organizationId: orgId, role: { in: ["admin", "manager", "agent"] } },
      select: { id: true, name: true, email: true },
    })

    if (users.length === 0) {
      return NextResponse.json({ error: "No available agents" }, { status: 400 })
    }

    // Count open tickets per user
    const openTickets = await prisma.ticket.groupBy({
      by: ["assignedTo"],
      where: {
        organizationId: orgId,
        status: { notIn: ["closed", "resolved"] },
        assignedTo: { not: null },
      },
      _count: { id: true },
    })

    const countMap: Record<string, number> = {}
    for (const row of openTickets) {
      if (row.assignedTo) countMap[row.assignedTo] = row._count.id
    }

    // Sort by ticket count ascending — least loaded first
    const sorted = users.sort((a, b) => (countMap[a.id] || 0) - (countMap[b.id] || 0))
    const leastLoaded = sorted[0]

    await prisma.ticket.update({
      where: { id },
      data: { assignedTo: leastLoaded.id },
    })

    return NextResponse.json({
      success: true,
      data: {
        assignedTo: leastLoaded.id,
        assigneeName: leastLoaded.name || leastLoaded.email,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ─── WhatsApp status notification ────────────────────────────────────────

const STATUS_MESSAGES: Record<string, string> = {
  in_progress: "Sizin sorğunuz ({ticketNumber}) qəbul edildi və hazırda üzərində işlənilir.",
  waiting: "Sorğunuz ({ticketNumber}) üzrə sizdən əlavə məlumat gözlənilir.",
  resolved: "Sorğunuz ({ticketNumber}) həll edildi. Əgər razı deyilsinizsə, bu mesaja cavab yazın — sorğu yenidən açılacaq.",
  closed: "Sorğunuz ({ticketNumber}) bağlandı. Əgər razı deyilsinizsə, bu mesaja cavab yazın — sorğu yenidən açılacaq.",
}

async function sendWhatsAppStatusNotification(
  orgId: string,
  ticket: { id: string; ticketNumber: string | null; description: string | null; contactId: string | null; tags: string[] },
  newStatus: string,
) {
  const template = STATUS_MESSAGES[newStatus]
  if (!template) return

  const message = template.replace("{ticketNumber}", ticket.ticketNumber || ticket.id.slice(0, 8))

  // Extract phone — same logic as comments route
  let waPhone: string | undefined

  // 1. From ticket description
  const phoneMatch = ticket.description?.match(/\+(\d{10,15})/)
  if (phoneMatch) waPhone = phoneMatch[1]

  // 2. From contact record
  if (!waPhone && ticket.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: ticket.contactId, organizationId: orgId },
      select: { phone: true },
    })
    if (contact?.phone) waPhone = contact.phone.replace(/[\s\-\(\)\+]/g, "")
  }

  // 3. From recent WhatsApp messages
  if (!waPhone && ticket.contactId) {
    const recentMsg = await prisma.channelMessage.findFirst({
      where: { organizationId: orgId, contactId: ticket.contactId, channelType: "whatsapp", direction: "inbound" },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    })
    const meta = recentMsg?.metadata as any
    if (meta?.waPhone) waPhone = meta.waPhone
  }

  if (!waPhone) {
    console.log(`[Ticket WA] No phone for status notification, ticket ${ticket.ticketNumber}`)
    return
  }

  const result = await sendWhatsAppMessage({
    to: waPhone,
    message,
    organizationId: orgId,
    contactId: ticket.contactId || undefined,
  })

  console.log(`[Ticket WA] Status "${newStatus}" notification to ${waPhone}: ${result.success ? "OK" : result.error}`)
}
