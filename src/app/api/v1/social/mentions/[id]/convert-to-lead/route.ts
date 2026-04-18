import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

/**
 * Convert a social mention into a Lead. Atomic pattern: create the Lead, then
 * try to claim the mention with updateMany guarded on leadId=null. If another
 * request won the race we delete the orphan Lead and return 409.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "leads", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const userId = auth.userId
  const { id } = await params

  const mention = await prisma.socialMention.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!mention) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (mention.leadId) {
    return NextResponse.json(
      { error: "Already converted", data: { leadId: mention.leadId } },
      { status: 409 },
    )
  }

  const contactName = mention.authorName || (mention.authorHandle ? `@${mention.authorHandle}` : `Visitor from ${mention.platform}`)
  const notes = [
    `Platform: ${mention.platform}`,
    mention.authorHandle ? `Handle: @${mention.authorHandle}` : null,
    mention.url ? `URL: ${mention.url}` : null,
    mention.sentiment ? `Sentiment: ${mention.sentiment}` : null,
    "",
    "Content:",
    mention.text,
  ].filter(Boolean).join("\n")

  const priority = mention.sentiment === "negative" ? "high" : "medium"

  const lead = await prisma.lead.create({
    data: {
      organizationId: orgId,
      contactName: contactName.slice(0, 200),
      source: `social:${mention.platform}`,
      status: "new",
      priority,
      notes,
      assignedTo: userId || null,
    },
  })

  const claim = await prisma.socialMention.updateMany({
    where: { id: mention.id, leadId: null },
    data: {
      leadId: lead.id,
      status: "converted_to_lead",
      handledAt: new Date(),
      handledBy: userId,
    },
  })
  if (claim.count === 0) {
    await prisma.lead.delete({ where: { id: lead.id } }).catch(() => {})
    const winner = await prisma.socialMention.findUnique({
      where: { id: mention.id },
      select: { leadId: true },
    })
    return NextResponse.json(
      { error: "Already converted", data: winner?.leadId ? { leadId: winner.leadId } : null },
      { status: 409 },
    )
  }

  return NextResponse.json({ success: true, data: { leadId: lead.id } })
}
