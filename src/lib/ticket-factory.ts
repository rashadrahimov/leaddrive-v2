import { prisma } from "@/lib/prisma"
import { autoAssignTicket } from "@/lib/auto-assign"
import { fireWebhooks } from "@/lib/webhooks"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"
import { logAudit } from "@/lib/prisma"

export interface CreateTicketInput {
  organizationId: string
  subject: string
  description?: string
  priority?: "low" | "medium" | "high" | "critical"
  category?: "general" | "technical" | "billing" | "feature_request"
  contactId?: string | null
  companyId?: string | null
  assignedTo?: string | null
  createdBy?: string | null
  tags?: string[]
  source?: string | null          // portal | email | whatsapp | web_chat | facebook | instagram | agent
  sourceMeta?: Record<string, any> // channel-specific context (phone, sessionId, externalId)
}

/**
 * Create a ticket with the full downstream flow:
 *   - Sequential TK-0001 numbering
 *   - Company → priority-based SLA resolution
 *   - Auto-assign (skill-based routing) when no assignee
 *   - Audit log, workflow engine, notifications, webhooks
 *
 * Used by the standard /api/v1/tickets POST endpoint AND by any system integration
 * that opens a ticket (web-chat escalation, social mention conversion, etc.).
 *
 * Pass `input.fireHooks = false` to create the ticket silently (no audit/webhook/
 * workflow/notification). Caller is then responsible for calling `fireTicketHooks`
 * once the ticket is "committed" (e.g., after an atomic claim succeeds). This is
 * how web-chat escalation avoids firing hooks for a ticket that was created-then-
 * deleted because another escalation call won the race.
 */
export async function fireTicketHooks(ticketId: string): Promise<void> {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return
  logAudit(ticket.organizationId, "create", "ticket", ticket.id, ticket.subject)
  executeWorkflows(ticket.organizationId, "ticket", "created", ticket).catch(() => {})
  fireWebhooks(ticket.organizationId, "ticket.created", {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    priority: ticket.priority,
  }).catch(() => {})
  if (ticket.assignedTo) {
    createNotification({
      organizationId: ticket.organizationId,
      userId: ticket.assignedTo,
      type: ticket.priority === "critical" ? "error" : ticket.priority === "high" ? "warning" : "info",
      title: `Новый тикет ${ticket.ticketNumber}`,
      message: ticket.subject,
      entityType: "ticket",
      entityId: ticket.id,
    }).catch(() => {})
  }
}

export async function createTicketWithAssignment(
  input: CreateTicketInput & { fireHooks?: boolean },
): Promise<{ id: string; ticketNumber: string; assignedTo: string | null; subject: string }> {
  const orgId = input.organizationId

  // 1. Sequential ticket number
  const all = await prisma.ticket.findMany({
    where: { organizationId: orgId },
    select: { ticketNumber: true },
  })
  const maxNum = all.reduce((max: number, t: { ticketNumber: string }) => {
    const num = parseInt(t.ticketNumber.replace(/[^0-9]/g, ""), 10) || 0
    return num > max ? num : max
  }, 0)
  const ticketNumber = `TK-${String(maxNum + 1).padStart(4, "0")}`

  const priority = input.priority || "medium"

  // 2. SLA resolution (company → priority-based)
  let slaPolicy: { id: string; name: string; resolutionHours: number; firstResponseHours: number } | null = null
  if (input.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: input.companyId, organizationId: orgId },
      select: { slaPolicy: true },
    })
    if (company?.slaPolicy) slaPolicy = company.slaPolicy as any
  }
  if (!slaPolicy) {
    slaPolicy = (await prisma.slaPolicy.findFirst({
      where: { organizationId: orgId, priority, isActive: true },
    })) as any
  }

  const now = Date.now()
  const slaDueAt = slaPolicy ? new Date(now + slaPolicy.resolutionHours * 3600000) : undefined
  const slaFirstResponseDueAt = slaPolicy ? new Date(now + slaPolicy.firstResponseHours * 3600000) : undefined

  // 3. Create ticket
  const ticket = await prisma.ticket.create({
    data: {
      organizationId: orgId,
      ticketNumber,
      subject: input.subject,
      description: input.description,
      priority,
      category: input.category || "general",
      status: "new",
      contactId: input.contactId || null,
      companyId: input.companyId || null,
      assignedTo: input.assignedTo || null,
      createdBy: input.createdBy || null,
      tags: input.tags || [],
      source: input.source || null,
      sourceMeta: input.sourceMeta || undefined,
      ...(slaDueAt ? { slaDueAt } : {}),
      ...(slaFirstResponseDueAt ? { slaFirstResponseDueAt } : {}),
      ...(slaPolicy ? { slaPolicyName: slaPolicy.name } : {}),
    },
  })

  let finalAssignee = ticket.assignedTo

  // 4. Auto-assign if none
  if (!input.assignedTo) {
    try {
      const result = await autoAssignTicket(ticket.id, orgId, ticket.category)
      if (result.assigned && result.agentId) {
        finalAssignee = result.agentId
      }
    } catch (e) {
      console.error("[ticket-factory] auto-assign failed:", e)
    }
  }

  // 5. Side effects (non-blocking). Skip when caller wants atomic claim first.
  if (input.fireHooks !== false) {
    logAudit(orgId, "create", "ticket", ticket.id, ticket.subject)
    executeWorkflows(orgId, "ticket", "created", ticket).catch(() => {})
    fireWebhooks(orgId, "ticket.created", {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      priority,
    }).catch(() => {})
    if (finalAssignee) {
      createNotification({
        organizationId: orgId,
        userId: finalAssignee,
        type: priority === "critical" ? "error" : priority === "high" ? "warning" : "info",
        title: `Новый тикет ${ticketNumber}`,
        message: ticket.subject,
        entityType: "ticket",
        entityId: ticket.id,
      }).catch(() => {})
    }
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    assignedTo: finalAssignee,
    subject: ticket.subject,
  }
}
