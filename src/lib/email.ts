import nodemailer from "nodemailer"

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
}: {
  to: string
  subject: string
  html: string
}) {
  // If SMTP is not configured, log to console (dev mode)
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`)
    console.log(`[EMAIL] Body: ${html}`)
    return { success: true, dev: true }
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `"LeadDrive CRM" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })

  return { success: true, messageId: info.messageId }
}

export function renderTemplate(htmlBody: string, variables: Record<string, string>): string {
  let rendered = htmlBody
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value)
  }
  return rendered
}
