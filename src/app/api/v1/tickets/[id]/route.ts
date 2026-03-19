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
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, organizationId: orgId },
      include: { comments: { orderBy: { createdAt: "desc" } } },
    })

    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: ticket })
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
        ...(parsed.data.description && { description: parsed.data.description }),
        ...(parsed.data.priority && { priority: parsed.data.priority }),
        ...(parsed.data.status && { status: parsed.data.status }),
        ...(parsed.data.assignedTo && { assignedTo: parsed.data.assignedTo }),
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
