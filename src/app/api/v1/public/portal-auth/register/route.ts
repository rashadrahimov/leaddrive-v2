import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import { sendEmail } from "@/lib/email"

// POST /api/v1/public/portal-auth/register — send verification email
export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { email, organizationId, slug } = body

  if (!email) return NextResponse.json({ error: "Email обязателен" }, { status: 400 })

  // SECURITY: Always return the same generic response to prevent email enumeration
  const genericResponse = { success: true, message: "Если указанный email связан с аккаунтом, на него будет отправлена ссылка для подтверждения." }

  // Resolve organization from slug or explicit ID
  // Priority: body.organizationId > body.slug > x-tenant-slug header > email lookup
  let orgId: string | null = null
  if (organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } })
    orgId = org?.id ?? null
  } else if (slug) {
    const org = await prisma.organization.findFirst({ where: { slug }, select: { id: true } })
    orgId = org?.id ?? null
  } else {
    const tenantSlug = req.headers.get("x-tenant-slug")
    if (tenantSlug) {
      const org = await prisma.organization.findFirst({ where: { slug: tenantSlug }, select: { id: true } })
      orgId = org?.id ?? null
    }
    if (!orgId) {
      const contact = await prisma.contact.findFirst({
        where: { email: email.toLowerCase().trim(), portalAccessEnabled: true },
        select: { organizationId: true },
      })
      orgId = contact?.organizationId ?? null
    }
  }

  // If no org resolved, return generic response (prevents org enumeration)
  if (!orgId) {
    return NextResponse.json(genericResponse)
  }

  // SECURITY: Scope email lookup to the resolved organization
  const contact = await prisma.contact.findFirst({
    where: { email: email.toLowerCase().trim(), organizationId: orgId },
    include: { organization: { select: { name: true } } },
  })

  // Return same generic message for all failure cases (prevents email enumeration)
  if (!contact || !contact.portalAccessEnabled || contact.portalPasswordHash) {
    return NextResponse.json(genericResponse)
  }

  // Generate verification token (32 bytes = 64 hex chars)
  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      portalVerificationToken: token,
      portalVerificationExpires: expires,
    },
  })

  // Build verification URL
  const baseUrl = process.env.NEXTAUTH_URL || "https://app.leaddrivecrm.org"
  const verifyUrl = `${baseUrl}/portal/set-password?token=${token}`

  // Build a deliverability-friendly email: both text + html, Reply-To pointing at
  // a human address (taken from org settings if configured), List-Unsubscribe
  // header to signal transactional-not-bulk, neutral "access link" subject.
  const orgSettings = (await prisma.organization.findUnique({
    where: { id: contact.organizationId },
    select: { settings: true, name: true },
  }))?.settings as { smtp?: { fromEmail?: string; replyTo?: string } } | null
  const replyTo = orgSettings?.smtp?.replyTo || orgSettings?.smtp?.fromEmail
  const unsubscribeUrl = `${baseUrl}/portal/unsubscribe?email=${encodeURIComponent(email)}`

  const textBody = [
    `Здравствуйте, ${contact.fullName}!`,
    ``,
    `Ссылка для входа на клиентский портал ${contact.organization.name}:`,
    verifyUrl,
    ``,
    `Ссылка действительна 24 часа. Если вы не запрашивали доступ, просто проигнорируйте это письмо.`,
    ``,
    `— ${contact.organization.name}`,
  ].join("\n")

  const result = await sendEmail({
    to: email,
    subject: `${contact.organization.name} — ссылка для входа на портал`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <p style="font-size: 15px;">Здравствуйте, <strong>${contact.fullName}</strong>!</p>
        <p style="font-size: 15px;">Ссылка для входа на клиентский портал <strong>${contact.organization.name}</strong>:</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="color: #2563eb; text-decoration: underline; font-size: 15px;">${verifyUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 13px;">Ссылка действительна 24 часа.</p>
        <p style="color: #6b7280; font-size: 13px;">Если вы не запрашивали доступ — просто проигнорируйте это письмо.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">— ${contact.organization.name}</p>
      </div>
    `,
    text: textBody,
    replyTo,
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "X-Entity-Ref-ID": token,
    },
    organizationId: contact.organizationId,
    contactId: contact.id,
  })

  if (!result.success) {
    return NextResponse.json({
      error: "Не удалось отправить письмо. Проверьте настройки SMTP или обратитесь к администратору.",
    }, { status: 500 })
  }

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: contact.organizationId,
        action: "portal_verification_sent",
        entityType: "contact",
        entityId: contact.id,
        entityName: contact.fullName,
        details: { email, ip: req.headers.get("x-forwarded-for") || "unknown" },
      },
    })
  } catch { /* non-critical */ }

  return NextResponse.json(genericResponse)
}
