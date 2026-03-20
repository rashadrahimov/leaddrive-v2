import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

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
    const ticket = await prisma.ticket.updateMany({
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

    if (ticket.count === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    const updated = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: { comments: { orderBy: { createdAt: "desc" } } },
    })

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
    const result = await prisma.ticket.deleteMany({
      where: { id, organizationId: orgId },
    })

    if (result.count === 0) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
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
