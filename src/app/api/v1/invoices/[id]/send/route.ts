import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const sendSchema = z.object({
  recipientEmail: z.string().email(),
  subject: z.string().optional(),
  message: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: { items: true, company: true },
    })
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Get SMTP settings
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true, name: true },
    })

    const settings = (org?.settings as Record<string, unknown>) || {}
    const smtp = settings.smtp as Record<string, unknown> | undefined

    const smtpHost = (smtp?.smtpHost || smtp?.host) as string | undefined
    const smtpPort = Number(smtp?.smtpPort || smtp?.port) || 587
    const smtpUser = (smtp?.smtpUser || smtp?.user) as string | undefined
    const smtpPass = (smtp?.smtpPass || smtp?.pass) as string | undefined
    const smtpFrom = (smtp?.fromEmail || smtp?.from || smtpUser) as string | undefined

    if (!smtpHost) {
      return NextResponse.json({ error: "SMTP not configured" }, { status: 400 })
    }

    const nodemailer = await import("nodemailer")
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const d = parsed.data
    const subject = d.subject || `Invoice ${invoice.invoiceNumber} from ${org?.name || "LeadDrive"}`
    const message = d.message || `Please find attached invoice ${invoice.invoiceNumber} for ${invoice.totalAmount} ${invoice.currency}.`

    await transporter.sendMail({
      from: smtpFrom,
      to: d.recipientEmail,
      subject,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Invoice ${invoice.invoiceNumber}</h2>
        <p>${message}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background: #f5f5f5;"><th style="padding: 8px; text-align: left;">Item</th><th style="padding: 8px; text-align: right;">Qty</th><th style="padding: 8px; text-align: right;">Price</th><th style="padding: 8px; text-align: right;">Total</th></tr>
          ${invoice.items.map((item: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${item.quantity}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${item.unitPrice}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${item.total}</td></tr>`).join("")}
        </table>
        <p style="font-size: 18px; font-weight: bold;">Total: ${invoice.totalAmount} ${invoice.currency}</p>
        ${invoice.dueDate ? `<p>Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ""}
      </div>`,
    })

    await prisma.invoice.update({
      where: { id },
      data: {
        status: invoice.status === "draft" ? "sent" : invoice.status,
        sentAt: new Date(),
        recipientEmail: d.recipientEmail,
      },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
