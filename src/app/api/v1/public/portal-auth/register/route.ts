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

  // Send verification email
  const result = await sendEmail({
    to: email,
    subject: "Подтверждение регистрации на портале",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">Регистрация на портале</h2>
        <p>Здравствуйте, <strong>${contact.fullName}</strong>!</p>
        <p>Вы запросили регистрацию на клиентском портале <strong>${contact.organization.name}</strong>.</p>
        <p>Для завершения регистрации перейдите по ссылке и создайте пароль:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
            Создать пароль
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Ссылка действительна в течение 24 часов.</p>
        <p style="color: #666; font-size: 13px;">Если вы не запрашивали регистрацию, проигнорируйте это письмо.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">LeadDrive CRM — клиентский портал</p>
      </div>
    `,
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
