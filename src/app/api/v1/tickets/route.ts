import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createTicketSchema = z.object({
  subject: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  category: z.enum(["general", "technical", "billing", "feature_request"]).optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
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

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.ticket.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { tickets, total, page, limit } })
  } catch {
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
    // Auto-generate ticket number
    const ticketNumber = `TK-${String(Date.now()).slice(-4).padStart(4, "0")}`

    const ticket = await prisma.ticket.create({
      data: {
        organizationId: orgId,
        ticketNumber,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority || "medium",
        category: parsed.data.category || "general",
        contactId: parsed.data.contactId,
        companyId: parsed.data.companyId,
      },
    })
    return NextResponse.json({ success: true, data: ticket }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
