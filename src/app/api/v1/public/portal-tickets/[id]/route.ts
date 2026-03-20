import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"

// GET /api/v1/public/portal-tickets/[id] — ticket detail with public comments
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const ticket = await prisma.ticket.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
      contactId: user.contactId,
    },
    include: {
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

  // Resolve user names for comments
  const userIds = [...new Set(ticket.comments.map(c => c.userId).filter(Boolean))] as string[]
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : []
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name || "Support"]))

  const comments = ticket.comments.map(c => ({
    id: c.id,
    comment: c.comment,
    isAgent: !!c.userId,
    authorName: c.userId ? (userMap[c.userId] || "Support") : user.fullName,
    createdAt: c.createdAt,
  }))

  return NextResponse.json({
    success: true,
    data: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      satisfactionRating: ticket.satisfactionRating,
      satisfactionComment: ticket.satisfactionComment,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      resolvedAt: ticket.resolvedAt,
      comments,
    },
  })
}

// POST /api/v1/public/portal-tickets/[id] — add comment from customer
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { comment } = await req.json()

  if (!comment || !comment.trim()) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 })
  }

  // Verify ticket belongs to this contact
  const ticket = await prisma.ticket.findFirst({
    where: { id, organizationId: user.organizationId, contactId: user.contactId },
  })
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

  const created = await prisma.ticketComment.create({
    data: {
      ticketId: id,
      comment: comment.trim(),
      isInternal: false,
      userId: null, // null = customer comment
    },
  })

  // If ticket was resolved/closed, reopen it
  if (ticket.status === "resolved" || ticket.status === "closed") {
    await prisma.ticket.update({
      where: { id },
      data: { status: "in_progress", resolvedAt: null, closedAt: null },
    })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: created.id,
      comment: created.comment,
      isAgent: false,
      authorName: user.fullName,
      createdAt: created.createdAt,
    },
  }, { status: 201 })
}

// PATCH /api/v1/public/portal-tickets/[id] — submit CSAT rating
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { satisfactionRating, satisfactionComment } = await req.json()

  if (!satisfactionRating || satisfactionRating < 1 || satisfactionRating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 })
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id, organizationId: user.organizationId, contactId: user.contactId },
  })
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

  if (!["resolved", "closed"].includes(ticket.status)) {
    return NextResponse.json({ error: "Can only rate resolved/closed tickets" }, { status: 400 })
  }

  await prisma.ticket.update({
    where: { id },
    data: {
      satisfactionRating,
      satisfactionComment: satisfactionComment || null,
    },
  })

  return NextResponse.json({ success: true })
}
