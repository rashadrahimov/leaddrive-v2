import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
  organizationId,
  campaignId,
  templateId,
  contactId,
  sentBy,
}: {
  to: string
  subject: string
  html: string
  organizationId?: string
  campaignId?: string
  templateId?: string
  contactId?: string
  sentBy?: string
}) {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@leaddrivecrm.org"

  // If SMTP is not configured, log to console (dev mode)
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)

    // Still log to DB if orgId available
    if (organizationId) {
      await prisma.emailLog.create({
        data: {
          organizationId,
          direction: "outbound",
          fromEmail,
          toEmail: to,
          subject,
          body: html,
          status: "failed",
          errorMessage: "SMTP not configured",
          campaignId,
          templateId,
          contactId,
          sentBy,
        },
      }).catch(() => {})
    }

    return { success: false, dev: true, error: "SMTP not configured" }
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
    })

    // Log success
    if (organizationId) {
      await prisma.emailLog.create({
        data: {
          organizationId,
          direction: "outbound",
          fromEmail,
          toEmail: to,
          subject,
          body: html,
          status: "sent",
          messageId: info.messageId,
          campaignId,
          templateId,
          contactId,
          sentBy,
        },
      }).catch(() => {})
    }

    return { success: true, messageId: info.messageId }
  } catch (err: any) {
    // Log failure
    if (organizationId) {
      await prisma.emailLog.create({
        data: {
          organizationId,
          direction: "outbound",
          fromEmail,
          toEmail: to,
          subject,
          body: html,
          status: "failed",
          errorMessage: err.message || "Unknown error",
          campaignId,
          templateId,
          contactId,
          sentBy,
        },
      }).catch(() => {})
    }

    return { success: false, error: err.message }
  }
}

export function renderTemplate(htmlBody: string, variables: Record<string, string>): string {
  let rendered = htmlBody
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
  }
  return rendered
}
