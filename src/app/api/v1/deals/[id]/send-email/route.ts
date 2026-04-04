import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"

const sendEmailSchema = z.object({
  contactId: z.string().min(1),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id: dealId } = await params
  const raw = await req.json()
  const parsed = sendEmailSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { contactId, subject, body } = parsed.data

  // Verify deal belongs to org
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId: auth.orgId },
    select: { id: true, name: true },
  })
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 })
  }

  // Get contact with email
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: auth.orgId },
    select: { id: true, fullName: true, email: true },
  })
  if (!contact || !contact.email) {
    return NextResponse.json({ error: "Contact not found or has no email" }, { status: 400 })
  }

  // Convert plain text body to HTML
  const htmlBody = body
    .split("\n")
    .map((line) => `<p>${line || "&nbsp;"}</p>`)
    .join("")

  // Send email via SMTP
  const result = await sendEmail({
    to: contact.email,
    subject,
    html: htmlBody,
    organizationId: auth.orgId,
    contactId: contact.id,
    sentBy: auth.userId,
  })

  // Create activity record regardless of send result
  await prisma.activity.create({
    data: {
      organizationId: auth.orgId,
      createdBy: auth.userId,
      type: "email",
      subject,
      description: body,
      contactId: contact.id,
      relatedType: "deal",
      relatedId: dealId,
    },
  })

  return NextResponse.json({
    success: true,
    emailSent: result.success,
    emailError: result.error || null,
    recipientName: contact.fullName,
    recipientEmail: contact.email,
  }, { status: 201 })
}
