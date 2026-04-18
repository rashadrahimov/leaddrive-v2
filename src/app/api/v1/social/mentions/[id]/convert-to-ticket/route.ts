import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { createTicketWithAssignment, fireTicketHooks } from "@/lib/ticket-factory"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "tickets", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const session = { userId: auth.userId }
  const { id } = await params

  const mention = await prisma.socialMention.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!mention) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (mention.ticketId) {
    return NextResponse.json(
      { error: "Already converted", data: { ticketId: mention.ticketId } },
      { status: 409 },
    )
  }

  const rawSubject = mention.text.split(/\r?\n/)[0]
  const subject = `[${mention.platform}] ${rawSubject.length > 80 ? rawSubject.slice(0, 77) + "…" : rawSubject}`
  const description = [
    `Platform: ${mention.platform}`,
    mention.authorName ? `Author: ${mention.authorName}${mention.authorHandle ? " (@" + mention.authorHandle + ")" : ""}` : null,
    mention.url ? `URL: ${mention.url}` : null,
    mention.sentiment ? `Sentiment: ${mention.sentiment}` : null,
    mention.reach ? `Reach: ${mention.reach}` : null,
    mention.engagement ? `Engagement: ${mention.engagement}` : null,
    "",
    "Content:",
    mention.text,
  ]
    .filter(Boolean)
    .join("\n")

  const priority = mention.sentiment === "negative" ? "high" : "medium"

  // Silent create; fire hooks only after atomic claim succeeds.
  const ticket = await createTicketWithAssignment({
    organizationId: orgId,
    subject,
    description,
    priority,
    category: "general",
    tags: ["social", mention.platform],
    createdBy: session?.userId || null,
    fireHooks: false,
  })

  const claim = await prisma.socialMention.updateMany({
    where: { id: mention.id, ticketId: null },
    data: {
      ticketId: ticket.id,
      status: "converted_to_ticket",
      handledAt: new Date(),
      handledBy: session?.userId,
    },
  })
  if (claim.count === 0) {
    await prisma.ticket.delete({ where: { id: ticket.id } }).catch(() => {})
    const winner = await prisma.socialMention.findUnique({
      where: { id: mention.id },
      select: { ticketId: true },
    })
    if (winner?.ticketId) {
      const t = await prisma.ticket.findUnique({
        where: { id: winner.ticketId },
        select: { id: true, ticketNumber: true },
      })
      if (t) {
        return NextResponse.json(
          { error: "Already converted", data: { ticketId: t.id, ticketNumber: t.ticketNumber } },
          { status: 409 },
        )
      }
    }
    return NextResponse.json({ error: "Concurrent conflict" }, { status: 409 })
  }

  await fireTicketHooks(ticket.id)
  return NextResponse.json({ success: true, data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber } })
}
