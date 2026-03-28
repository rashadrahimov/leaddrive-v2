import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"

export async function GET() {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tickets = await prisma.ticket.findMany({
    where: {
      organizationId: user.organizationId,
      contactId: user.contactId,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      closedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: tickets })
}

export async function POST(req: NextRequest) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { subject, description, category, priority } = await req.json()
  if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 })

  // Generate ticket number
  const count = await prisma.ticket.count({
    where: { organizationId: user.organizationId },
  })
  const ticketNumber = `TK-${String(count + 1).padStart(5, "0")}`

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: user.organizationId,
      ticketNumber,
      subject,
      description: description || null,
      category: category || "general",
      priority: priority || "medium",
      status: "new",
      contactId: user.contactId,
      companyId: user.companyId,
      createdBy: user.contactId,
    },
  })

  return NextResponse.json({ success: true, data: ticket }, { status: 201 })
}
