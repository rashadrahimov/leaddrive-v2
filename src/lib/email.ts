import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { isPrivateHost } from "@/lib/url-validation"
import { NOREPLY_EMAIL, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME_FALLBACK } from "@/lib/constants"

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

// Resend provider — transactional-email service with much better deliverability than
// self-hosted Gmail SMTP. Activated automatically when RESEND_API_KEY is set in env.
// Falls back to the SMTP path on any error.
async function sendViaResend(params: {
  from: string
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  headers?: Record<string, string>
}): Promise<{ messageId: string } | null> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(params.text ? { text: params.text } : {}),
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
        ...(params.headers ? { headers: params.headers } : {}),
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      console.error("[email] Resend failed:", res.status, t)
      return null
    }
    const json = await res.json()
    return { messageId: json.id || "resend" }
  } catch (e) {
    console.error("[email] Resend exception:", e)
    return null
  }
}

// Plain-text fallback derived from HTML — reduces spam score: text/html multipart
// messages that carry both versions are trusted more than HTML-only ones.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
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
  text?: string
  replyTo?: string
  headers?: Record<string, string>
  organizationId?: string
  campaignId?: string
  templateId?: string
  contactId?: string
  variantId?: string
  sentBy?: string
  attachments?: { filename: string; path: string }[]
}) {
  const config = await getSmtpConfig(organizationId)

  // When Resend is enabled globally (RESEND_API_KEY set), we use a single
  // technical sender address `EMAIL_FROM_ADDRESS` for ALL tenants and just
  // swap the friendly name to the organization's display name so recipients
  // still see their brand. This removes the need for per-tenant SMTP setup.
  let resendFromStr: string | null = null
  if (process.env.RESEND_API_KEY && EMAIL_FROM_ADDRESS) {
    let orgName = EMAIL_FROM_NAME_FALLBACK
    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      })
      orgName = org?.name || orgName
    }
    resendFromStr = `"${orgName}" <${EMAIL_FROM_ADDRESS}>`
  }

  const fromEmail = resendFromStr
    ? EMAIL_FROM_ADDRESS
    : config?.fromEmail || NOREPLY_EMAIL

  // If neither Resend nor SMTP is configured, log and bail.
  if (!config && !resendFromStr) {
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
    const transporter = config ? createTransporter(config) : null
    const smtpFromStr = config
      ? (config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail)
      : null
    // Resend path gets the centralized sender; SMTP path keeps per-tenant from.
    const fromStr = resendFromStr || smtpFromStr || NOREPLY_EMAIL
    const textBody = text || htmlToPlainText(html)

    // Create log first to get ID for tracking pixel
    let logId: string | undefined
    if (organizationId && campaignId) {
      try {
        const log = await prisma.emailLog.create({
          data: {
            organizationId,
            direction: "outbound",
            fromEmail,
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

    // Prefer Resend when RESEND_API_KEY is set — transactional service with far
    // better deliverability than Gmail SMTP. On any failure we drop back to SMTP
    // (if a per-tenant SMTP config is available).
    const resendResult = await sendViaResend({
      from: fromStr,
      to,
      subject,
      html: finalHtml,
      text: textBody,
      replyTo,
      headers,
    })

    let info: { messageId: string }
    if (resendResult) {
      info = { messageId: resendResult.messageId }
    } else if (transporter) {
      info = await transporter.sendMail({
        from: fromStr,
        to,
        subject,
        html: finalHtml,
        text: textBody,
        ...(replyTo ? { replyTo } : {}),
        ...(headers ? { headers } : {}),
        ...(attachments?.length ? { attachments } : {}),
      })
    } else {
      throw new Error("Email delivery failed: Resend rejected and no SMTP fallback configured")
    }

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
          fromEmail,
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
          fromEmail,
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
