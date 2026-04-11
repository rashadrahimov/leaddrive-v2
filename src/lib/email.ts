import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { isPrivateHost } from "@/lib/url-validation"
import { NOREPLY_EMAIL } from "@/lib/constants"

interface SmtpConfig {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpTls: boolean
  fromEmail: string
  fromName: string
}

async function getSmtpConfig(organizationId?: string): Promise<SmtpConfig | null> {
  // First try DB settings for the organization
  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true, name: true },
    })
    const settings = (org?.settings as any) || {}
    const smtp = settings.smtp
    if (smtp?.smtpHost && smtp?.smtpUser && smtp?.smtpPass) {
      return {
        smtpHost: smtp.smtpHost,
        smtpPort: smtp.smtpPort || 587,
        smtpUser: smtp.smtpUser,
        smtpPass: smtp.smtpPass,
        smtpTls: smtp.smtpTls !== false,
        fromEmail: smtp.fromEmail || smtp.smtpUser,
        fromName: smtp.fromName || org?.name || "LeadDrive CRM",
      }
    }
  }

  // Fallback to env vars
  if (process.env.SMTP_USER) {
    return {
      smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
      smtpPort: Number(process.env.SMTP_PORT || 587),
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS || "",
      smtpTls: true,
      fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER,
      fromName: "LeadDrive CRM",
    }
  }

  return null
}

function createTransporter(config: SmtpConfig) {
  // SSRF protection: block SMTP to private/internal hosts
  if (isPrivateHost(config.smtpHost)) {
    throw new Error("SMTP host points to a private/internal network — blocked for security")
  }

  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    tls: config.smtpTls ? { rejectUnauthorized: true } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

export async function sendEmail({
  to,
  subject,
  html,
  organizationId,
  campaignId,
  templateId,
  contactId,
  variantId,
  sentBy,
  attachments,
}: {
  to: string
  subject: string
  html: string
  organizationId?: string
  campaignId?: string
  templateId?: string
  contactId?: string
  variantId?: string
  sentBy?: string
  attachments?: { filename: string; path: string }[]
}) {
  const config = await getSmtpConfig(organizationId)
  const fromEmail = config?.fromEmail || NOREPLY_EMAIL

  // If SMTP is not configured, log and return error
  if (!config) {
    console.log(`[EMAIL] SMTP not configured | To: ${to} | Subject: ${subject}`)

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
          variantId,
          sentBy,
        },
      }).catch(() => {})
    }

    return { success: false, error: "SMTP not configured" }
  }

  try {
    const transporter = createTransporter(config)
    const fromStr = config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail

    // Create log first to get ID for tracking pixel
    let logId: string | undefined
    if (organizationId && campaignId) {
      try {
        const log = await prisma.emailLog.create({
          data: {
            organizationId,
            direction: "outbound",
            fromEmail: config.fromEmail,
            toEmail: to,
            subject,
            body: html,
            status: "pending",
            campaignId,
            templateId,
            contactId,
            variantId,
            sentBy,
          },
        })
        logId = log.id
      } catch {}
    }

    // Inject tracking pixel and rewrite links for campaign emails
    let finalHtml = html
    if (logId && campaignId) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://app.leaddrivecrm.org"
      // Inject open tracking pixel before </body> or at the end
      const trackingPixel = `<img src="${baseUrl}/api/v1/tracking/open?logId=${logId}" width="1" height="1" style="display:none" alt="" />`
      if (finalHtml.includes("</body>")) {
        finalHtml = finalHtml.replace("</body>", `${trackingPixel}</body>`)
      } else {
        finalHtml += trackingPixel
      }
      // Rewrite links for click tracking (only http/https links in href)
      finalHtml = finalHtml.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
        return `href="${baseUrl}/api/v1/tracking/click?logId=${logId}&url=${encodeURIComponent(url)}"`
      })
    }

    const info = await transporter.sendMail({
      from: fromStr,
      to,
      subject,
      html: finalHtml,
      ...(attachments?.length ? { attachments } : {}),
    })

    // Update log with success
    if (logId) {
      await prisma.emailLog.update({
        where: { id: logId },
        data: { status: "sent", messageId: info.messageId },
      }).catch(() => {})
    } else if (organizationId) {
      await prisma.emailLog.create({
        data: {
          organizationId,
          direction: "outbound",
          fromEmail: config.fromEmail,
          toEmail: to,
          subject,
          body: html,
          status: "sent",
          messageId: info.messageId,
          campaignId,
          templateId,
          contactId,
          variantId,
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
          fromEmail: config.fromEmail,
          toEmail: to,
          subject,
          body: html,
          status: "failed",
          errorMessage: err.message || "Unknown error",
          campaignId,
          templateId,
          contactId,
          variantId,
          sentBy,
        },
      }).catch(() => {})
    }

    return { success: false, error: "Failed to send email" }
  }
}

function escapeHtmlValue(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

export function renderTemplate(htmlBody: string, variables: Record<string, string>): string {
  let rendered = htmlBody
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replaceAll(`{{${key}}}`, escapeHtmlValue(value))
  }
  return rendered
}
