import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { sendSms } from "@/lib/sms"
import crypto from "crypto"

interface SendInviteInput {
  surveyId: string
  organizationId: string
  email?: string | null
  phone?: string | null
  contactId?: string | null
  ticketId?: string | null
  channel?: "email" | "sms" | "link"
  baseUrl?: string
}

function signUnsubToken(orgId: string, surveyId: string, email: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "ld-survey-unsub"
  return crypto
    .createHmac("sha256", secret)
    .update(`${orgId}:${surveyId}:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32)
}

export function verifyUnsubToken(orgId: string, surveyId: string, email: string, token: string): boolean {
  const expected = signUnsubToken(orgId, surveyId, email)
  const a = Buffer.from(expected)
  const b = Buffer.from(token)
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)
}

export async function sendSurveyInvite({
  surveyId,
  organizationId,
  email,
  phone,
  contactId,
  ticketId,
  channel = "email",
  baseUrl,
}: SendInviteInput): Promise<{ ok: boolean; error?: string }> {
  const survey = await prisma.survey.findFirst({
    where: { id: surveyId, organizationId, status: "active" },
  })
  if (!survey) return { ok: false, error: "survey not active" }

  const appUrl = baseUrl || process.env.NEXTAUTH_URL || process.env.APP_URL || ""
  const link = `${appUrl.replace(/\/$/, "")}/s/${survey.publicSlug}`

  if (channel === "sms") {
    if (!phone) return { ok: false, error: "no phone" }

    // Check phone-level unsubscribe (STOP reply or manual suppression)
    const suppressedSms = await prisma.surveyUnsubscribe.findFirst({
      where: { organizationId, phone, OR: [{ surveyId: null }, { surveyId }] },
      select: { id: true },
    }).catch(() => null)
    if (suppressedSms) return { ok: false, error: "unsubscribed" }

    // TCPA-compliant footer: tell recipient how to stop
    const smsMessage = `${survey.name}\n${link}\n\nReply STOP to unsubscribe.`
    const result = await sendSms({ to: phone, message: smsMessage, organizationId })
    if (!result.success) return { ok: false, error: result.error || "sms send failed" }
    await prisma.survey.update({
      where: { id: survey.id },
      data: { totalSent: { increment: 1 } },
    })
    return { ok: true }
  }

  if (!email) return { ok: false, error: "no email" }

  // Check unsubscribe list
  const suppressed = await prisma.surveyUnsubscribe.findFirst({
    where: { organizationId, email: email.toLowerCase(), OR: [{ surveyId: null }, { surveyId }] },
    select: { id: true },
  }).catch(() => null)
  if (suppressed) return { ok: false, error: "unsubscribed" }

  const unsubToken = signUnsubToken(organizationId, survey.id, email)
  const unsubUrl = `${appUrl.replace(/\/$/, "")}/s/unsubscribe?s=${survey.id}&e=${encodeURIComponent(email)}&t=${unsubToken}`

  const subject = `${survey.name}`
  const title = htmlEscape(survey.name)
  const desc = survey.description ? htmlEscape(survey.description) : "We'd love to hear your feedback."
  const html = `
<!doctype html><html><body style="font-family:system-ui,Segoe UI,Arial;margin:0;padding:24px;background:#f5f5f5;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.05)">
    <h1 style="margin:0 0 12px;font-size:20px">${title}</h1>
    <p style="color:#555;line-height:1.5">${desc}</p>
    <p style="margin:24px 0">
      <a href="${link}" style="background:#0176D3;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:500">Take the survey</a>
    </p>
    <p style="color:#888;font-size:12px;margin:0">Or paste this link in your browser: <a href="${link}">${link}</a></p>
    <p style="color:#bbb;font-size:11px;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
      Don't want to receive these? <a href="${unsubUrl}" style="color:#888">Unsubscribe</a>
    </p>
  </div>
</body></html>`

  try {
    const result = await sendEmail({ to: email, subject, html, organizationId, contactId: contactId || undefined })
    if (!result?.success) return { ok: false, error: (result as any)?.error || "smtp send failed" }

    await prisma.survey.update({
      where: { id: survey.id },
      data: { totalSent: { increment: 1 } },
    })
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message || "send error" }
  }
}

/**
 * Fire when a ticket transitions into "resolved".
 * Finds all active surveys in this org that have trigger `afterTicketResolve = true`
 * and sends invites to the linked contact's email.
 */
export async function triggerSurveysOnTicketResolved(
  orgId: string,
  ticket: { id: string; contactId: string | null; ticketNumber: string },
): Promise<void> {
  if (!ticket.contactId) return

  const contact = await prisma.contact.findFirst({
    where: { id: ticket.contactId, organizationId: orgId },
    select: { email: true, id: true },
  })
  if (!contact?.email) return

  const surveys = await prisma.survey.findMany({
    where: {
      organizationId: orgId,
      status: "active",
      channels: { has: "email" },
    },
  })

  for (const s of surveys) {
    const triggers = (s.triggers as any) || {}
    if (!triggers.afterTicketResolve) continue

    // Avoid spamming: skip if contact already responded to this survey for this ticket
    const already = await prisma.surveyResponse.findFirst({
      where: { surveyId: s.id, ticketId: ticket.id },
      select: { id: true },
    })
    if (already) continue

    await sendSurveyInvite({
      surveyId: s.id,
      organizationId: orgId,
      email: contact.email,
      contactId: contact.id,
      ticketId: ticket.id,
      channel: "email",
    })
  }
}

/**
 * Generic trigger runner used by deal-won / invoice-paid / lead-converted
 * hooks. Skips contacts that already responded to the same survey for the
 * same source entity (deduped via SurveyResponse.contactId match).
 */
async function runSurveyTrigger(
  orgId: string,
  triggerKey: "afterDealWon" | "afterInvoicePaid" | "afterLeadConverted",
  contactId: string | null,
): Promise<void> {
  if (!contactId) return
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: orgId },
    select: { email: true, phone: true, id: true },
  })
  if (!contact?.email && !contact?.phone) return

  const surveys = await prisma.survey.findMany({
    where: { organizationId: orgId, status: "active" },
  })

  for (const s of surveys) {
    const triggers = (s.triggers as any) || {}
    if (!triggers[triggerKey]) continue

    // Don't re-survey the same contact for the same survey twice.
    const already = await prisma.surveyResponse.findFirst({
      where: { surveyId: s.id, contactId: contact.id },
      select: { id: true },
    })
    if (already) continue

    const channel: "email" | "sms" = (s.channels as string[]).includes("email") && contact.email ? "email" : "sms"
    await sendSurveyInvite({
      surveyId: s.id,
      organizationId: orgId,
      email: contact.email,
      phone: contact.phone,
      contactId: contact.id,
      channel,
    })
  }
}

export async function triggerSurveysOnDealWon(orgId: string, contactId: string | null): Promise<void> {
  return runSurveyTrigger(orgId, "afterDealWon", contactId)
}

export async function triggerSurveysOnInvoicePaid(orgId: string, contactId: string | null): Promise<void> {
  return runSurveyTrigger(orgId, "afterInvoicePaid", contactId)
}

export async function triggerSurveysOnLeadConverted(orgId: string, contactId: string | null): Promise<void> {
  return runSurveyTrigger(orgId, "afterLeadConverted", contactId)
}
