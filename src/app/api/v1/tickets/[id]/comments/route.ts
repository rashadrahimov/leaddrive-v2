import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

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

  // Send reply to WhatsApp if ticket originated from WhatsApp and comment is not internal
  if (!parsed.data.isInternal && ticket.tags && (ticket.tags as string[]).includes("whatsapp")) {
    try {
      // Extract phone number from ticket description (format: "+994512060838")
      const phoneMatch = ticket.description?.match(/\+(\d{10,15})/)
      let waPhone = phoneMatch?.[1]

      // If no phone in description, try to get from contact
      if (!waPhone && ticket.contactId) {
        const contact = await prisma.contact.findFirst({
          where: { id: ticket.contactId, organizationId: orgId },
          select: { phone: true },
        })
        if (contact?.phone) {
          waPhone = contact.phone.replace(/[\s\-\(\)\+]/g, "")
        }
      }

      // Also try to find from recent WhatsApp inbound messages for this contact
      if (!waPhone && ticket.contactId) {
        const recentWaMsg = await prisma.channelMessage.findFirst({
          where: {
            organizationId: orgId,
            contactId: ticket.contactId,
            channelType: "whatsapp",
            direction: "inbound",
          },
          orderBy: { createdAt: "desc" },
          select: { metadata: true },
        })
        const meta = recentWaMsg?.metadata as any
        if (meta?.waPhone) {
          waPhone = meta.waPhone
        }
      }

      if (waPhone) {
        const result = await sendWhatsAppMessage({
          to: waPhone,
          message: parsed.data.comment,
          organizationId: orgId,
          contactId: ticket.contactId || undefined,
        })
        console.log(`[Ticket WA] Reply to ${waPhone} for ticket ${ticket.ticketNumber}: ${result.success ? "OK" : result.error}`)
      } else {
        console.log(`[Ticket WA] No phone found for ticket ${ticket.ticketNumber}`)
      }
    } catch (err) {
      console.error(`[Ticket WA] Error sending reply:`, err)
    }
  }

  return NextResponse.json({ success: true, data: comment }, { status: 201 })
}
