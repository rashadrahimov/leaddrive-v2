import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const commentSchema = z.object({
  comment: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: ticketId } = await params

  const body = await req.json()
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  // Verify ticket exists and belongs to org
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, organizationId: orgId },
  })
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

  // Get current user from middleware-injected header
  const userId = req.headers.get("x-user-id") || null

  const comment = await prisma.ticketComment.create({
    data: {
      ticketId,
      userId,
      comment: parsed.data.comment,
      isInternal: parsed.data.isInternal,
    },
  })

  // Update firstResponseAt if this is the first staff response
  if (!ticket.firstResponseAt && !parsed.data.isInternal) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { firstResponseAt: new Date() },
    })
  }

  return NextResponse.json({ success: true, data: comment }, { status: 201 })
}
