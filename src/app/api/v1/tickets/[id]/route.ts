import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession, requireAuth, isAuthError } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { sendWhatsAppMessage } from "@/lib/whatsapp"
import { executeWorkflows } from "@/lib/workflow-engine"
import { autoAssignTicket } from "@/lib/auto-assign"
import { fireWebhooks } from "@/lib/webhooks"
import { triggerSurveysOnTicketResolved } from "@/lib/survey-triggers"

const updateTicketSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["new", "open", "in_progress", "waiting", "resolved", "closed"]).optional(),
  assignedTo: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  category: z.enum(["general", "technical", "billing", "feature_request"]).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const { id } = await params

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: { comments: { orderBy: { createdAt: "asc" } } },  // TicketComment has no organizationId — safe (FK-scoped child)
    })

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    // Resolve user names for comments, assignee, company
    const userIds = [...new Set([
      ...ticket.comments.map((c: any) => c.userId).filter(Boolean),
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

    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name || u.email]))

    const contactName = contact?.fullName || contact?.email || "Клиент"

    const enrichedComments = ticket.comments.map((c: any) => ({
      ...c,
      userName: c.userId ? userMap[c.userId] || "Support" : contactName,
    }))

    const fieldPerms = await getFieldPermissions(orgId, role, "ticket")
    const enrichedTicket = {
      ...ticket,
      comments: enrichedComments,
      assigneeName: ticket.assignedTo ? userMap[ticket.assignedTo] || ticket.assignedTo : null,
      companyName: company?.name || null,
      contactName: contactName !== "Клиент" ? contactName : null,
    }
    const filteredTicket = filterEntityFields(enrichedTicket, fieldPerms, role)

    return NextResponse.json({
      success: true,
      data: filteredTicket,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, "tickets", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const session = await getSession(req)
  const role = session?.role || "admin"
  const { id } = await params
  const body = await req.json()
  const preFieldPerms = await getFieldPermissions(orgId, role, "ticket")
  const filteredBody = filterWritableFields(body, preFieldPerms, role)
  const parsed = updateTicketSchema.safeParse(filteredBody)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Fetch original ticket to detect status change
    const original = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!original) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    const oldStatus = original.status

    const fieldPerms = await getFieldPermissions(orgId, role, "ticket")
    // Increment escalationLevel when priority is changed to critical
    const isEscalation = parsed.data.priority === "critical" && original.priority !== "critical"

    const updateData = {
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
      ...(isEscalation && { escalationLevel: (original.escalationLevel || 0) + 1, lastEscalatedAt: new Date() }),
    }
    const filteredUpdateData = filterWritableFields(updateData, fieldPerms, role)

    await prisma.ticket.updateMany({
      where: { id, organizationId: orgId },
      data: filteredUpdateData,
    })

    const updated = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: { comments: { orderBy: { createdAt: "desc" } } },  // TicketComment has no organizationId — safe (FK-scoped child)
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
      const webhookEvent = updated.status === "resolved" ? "ticket.resolved" : "ticket.updated"
      fireWebhooks(orgId, webhookEvent, { id: updated.id, ticketNumber: updated.ticketNumber, subject: updated.subject, status: updated.status }).catch(() => {})

      // Fire survey triggers when ticket transitions to resolved (§8 trigger)
      if (oldStatus !== "resolved" && updated.status === "resolved") {
        triggerSurveysOnTicketResolved(orgId, {
          id: updated.id,
          contactId: updated.contactId,
          ticketNumber: updated.ticketNumber,
        }).catch(err => console.error("[survey-trigger] ticket.resolved:", err))
      }
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, "tickets", "delete")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const { id } = await params

  try {
    const existing = await prisma.ticket.findFirst({ where: { id, organizationId: orgId }, select: { subject: true } })
    const result = await prisma.ticket.deleteMany({
      where: { id, organizationId: orgId },
    })

    if (result.count === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    logAudit(orgId, "delete", "ticket", id, existing?.subject || "")
    fireWebhooks(orgId, "ticket.deleted", { id, subject: existing?.subject }).catch(() => {})
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/v1/tickets/[id] — auto-assign via skill-based routing
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, "tickets", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const { id } = await params

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    const result = await autoAssignTicket(ticket.id, orgId, ticket.category)

    if (!result.assigned) {
      return NextResponse.json({ error: "No available agents" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        assignedTo: result.agentId,
        assigneeName: result.agentName,
        queueName: result.queueName,
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
