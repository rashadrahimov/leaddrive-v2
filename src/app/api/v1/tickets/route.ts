import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"
import { autoAssignTicket } from "@/lib/auto-assign"
import { fireWebhooks } from "@/lib/webhooks"
import { trackContactEvent } from "@/lib/contact-events"
import { sendSlackNotification, formatTicketNotification } from "@/lib/slack"

const createTicketSchema = z.object({
  subject: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.enum(["general", "technical", "billing", "feature_request"]).optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  assignedTo: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || ""
  const companyId = searchParams.get("companyId") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    let where: any = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(companyId ? { companyId } : {}),
    }
    where = await applyRecordFilter(orgId, session?.userId || "", role, "ticket", where)

    const [rawTickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ticket.count({ where }),
    ])

    // Resolve company names and assignee names
    const companyIds = [...new Set(rawTickets.map((t: any) => t.companyId).filter(Boolean))] as string[]
    const userIds = [...new Set(rawTickets.map((t: any) => t.assignedTo).filter(Boolean))] as string[]

    const [companies, users] = await Promise.all([
      companyIds.length > 0
        ? prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : Promise.resolve([]),
    ])

    const companyMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]))
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name || u.email]))

    const tickets = rawTickets.map((t: any) => ({
      ...t,
      companyName: t.companyId ? companyMap[t.companyId] || null : null,
      assigneeName: t.assignedTo ? userMap[t.assignedTo] || null : null,
    }))

    const fieldPerms = await getFieldPermissions(orgId, role, "ticket")
    const filteredTickets = tickets.map((t: any) => filterEntityFields(t, fieldPerms, role))

    return NextResponse.json({ success: true, data: { tickets: filteredTickets, total, page, limit } })
  } catch (e) {
    console.error("Tickets GET error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const body = await req.json()
  const parsed = createTicketSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Auto-generate sequential ticket number (find max across all tickets)
    const allTickets = await prisma.ticket.findMany({
      where: { organizationId: orgId },
      select: { ticketNumber: true },
    })
    const maxNum = allTickets.reduce((max: number, t: any) => {
      const num = parseInt(t.ticketNumber.replace(/[^0-9]/g, ""), 10) || 0
      return num > max ? num : max
    }, 0)
    const ticketNumber = `TK-${String(maxNum + 1).padStart(4, "0")}`

    // Calculate SLA due date: company SLA → priority-based SLA → default
    const priority = parsed.data.priority || "medium"
    let slaDueAt: Date | undefined
    let slaPolicy = null

    // 1. Try company-specific SLA
    if (parsed.data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: parsed.data.companyId, organizationId: orgId },
        select: { slaPolicy: true },
      })
      if (company?.slaPolicy?.id) {
        slaPolicy = company.slaPolicy
      }
    }

    // 2. Fallback to priority-based SLA
    if (!slaPolicy) {
      slaPolicy = await prisma.slaPolicy.findFirst({
        where: { organizationId: orgId, priority, isActive: true },
      })
    }

    let slaFirstResponseDueAt: Date | undefined
    let slaPolicyName: string | undefined

    if (slaPolicy) {
      slaDueAt = new Date(Date.now() + slaPolicy.resolutionHours * 3600000)
      slaFirstResponseDueAt = new Date(Date.now() + slaPolicy.firstResponseHours * 3600000)
      slaPolicyName = slaPolicy.name
    }

    const fieldPerms = await getFieldPermissions(orgId, role, "ticket")
    const writableData = filterWritableFields({
      subject: parsed.data.subject,
      description: parsed.data.description,
      priority,
      category: parsed.data.category || "general",
      contactId: parsed.data.contactId,
      companyId: parsed.data.companyId,
      assignedTo: parsed.data.assignedTo,
    }, fieldPerms, role)

    const ticket = await prisma.ticket.create({
      data: {
        organizationId: orgId,
        ticketNumber,
        ...writableData,
        ...(slaDueAt ? { slaDueAt } : {}),
        ...(slaFirstResponseDueAt ? { slaFirstResponseDueAt } : {}),
        ...(slaPolicyName ? { slaPolicyName } : {}),
      },
    })
    // Auto-assign via skill-based routing if no explicit assignee
    if (!parsed.data.assignedTo) {
      const assignResult = await autoAssignTicket(ticket.id, orgId, ticket.category)
      if (assignResult.assigned && assignResult.agentId) {
        // Re-fetch to get updated assignedTo
        const updated = await prisma.ticket.findFirst({ where: { id: ticket.id } })
        if (updated) Object.assign(ticket, updated)
      }
    }

    logAudit(orgId, "create", "ticket", ticket.id, ticket.subject)
    executeWorkflows(orgId, "ticket", "created", ticket).catch(() => {})
    createNotification({
      organizationId: orgId,
      userId: ticket.assignedTo || "",
      type: priority === "critical" ? "error" : priority === "high" ? "warning" : "info",
      title: `Новый тикет ${ticketNumber}`,
      message: `${ticket.subject}${priority === "critical" ? " (КРИТИЧЕСКИЙ)" : ""}`,
      entityType: "ticket",
      entityId: ticket.id,
    }).catch(() => {})
    fireWebhooks(orgId, "ticket.created", { id: ticket.id, ticketNumber: ticket.ticketNumber, subject: ticket.subject, priority: ticket.priority }).catch(() => {})
    if (ticket.contactId) trackContactEvent(orgId, ticket.contactId, "ticket_created", { ticketId: ticket.id }).catch(() => {})
    // Auto Slack notification
    prisma.channelConfig.findMany({ where: { organizationId: orgId, channelType: "slack", isActive: true } }).then((configs: any) => {
      const msg = formatTicketNotification({ ticketNumber: ticket.ticketNumber, subject: ticket.subject, priority: ticket.priority, status: ticket.status })
      for (const cfg of configs) {
        if (cfg.webhookUrl) sendSlackNotification(cfg.webhookUrl, msg).catch(() => {})
      }
    }).catch(() => {})
    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
