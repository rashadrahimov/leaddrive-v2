import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { executeWorkflows } from "@/lib/workflow-engine"

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
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
    }

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
    const companyIds = [...new Set(rawTickets.map(t => t.companyId).filter(Boolean))] as string[]
    const userIds = [...new Set(rawTickets.map(t => t.assignedTo).filter(Boolean))] as string[]

    const [companies, users] = await Promise.all([
      companyIds.length > 0
        ? prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
        : Promise.resolve([]),
      userIds.length > 0
        ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
        : Promise.resolve([]),
    ])

    const companyMap = Object.fromEntries(companies.map(c => [c.id, c.name]))
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name || u.email]))

    const tickets = rawTickets.map(t => ({
      ...t,
      companyName: t.companyId ? companyMap[t.companyId] || null : null,
      assigneeName: t.assignedTo ? userMap[t.assignedTo] || null : null,
    }))

    return NextResponse.json({ success: true, data: { tickets, total, page, limit } })
  } catch (e) {
    console.error("Tickets GET error:", e)
    return NextResponse.json({ success: true, data: { tickets: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createTicketSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Auto-generate sequential ticket number
    const lastTicket = await prisma.ticket.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: { ticketNumber: true },
    })
    const lastNum = lastTicket?.ticketNumber
      ? parseInt(lastTicket.ticketNumber.replace(/[^0-9]/g, ""), 10) || 0
      : 0
    const ticketNumber = `TK-${String(lastNum + 1).padStart(4, "0")}`

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

    if (slaPolicy) {
      slaDueAt = new Date(Date.now() + slaPolicy.resolutionHours * 3600000)
    }

    const ticket = await prisma.ticket.create({
      data: {
        organizationId: orgId,
        ticketNumber,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority,
        category: parsed.data.category || "general",
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
        assignedTo: parsed.data.assignedTo,
        ...(slaDueAt ? { slaDueAt } : {}),
      },
    })
    executeWorkflows(orgId, "ticket", "created", ticket).catch(() => {})
    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
