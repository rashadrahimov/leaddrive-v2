import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createPortalToken } from "@/lib/portal-auth"
import bcrypt from "bcryptjs"

// POST /api/v1/public/portal-auth/register — register portal account
export async function POST(req: NextRequest) {
  const { email, password, confirmPassword } = await req.json()

  if (!email) return NextResponse.json({ error: "Email обязателен" }, { status: 400 })
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Пароль должен быть не менее 6 символов" }, { status: 400 })
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Пароли не совпадают" }, { status: 400 })
  }

  const contact = await prisma.contact.findFirst({
    where: { email },
    include: { company: true },
  })

  if (!contact) {
    return NextResponse.json({ error: "Контакт с таким email не найден. Обратитесь к администратору." }, { status: 404 })
  }

  if (!contact.portalAccessEnabled) {
    return NextResponse.json({ error: "Доступ к порталу не активирован для вашего аккаунта. Обратитесь к администратору." }, { status: 403 })
  }

  if (contact.portalPasswordHash) {
    return NextResponse.json({ error: "Аккаунт уже зарегистрирован. Войдите через страницу входа." }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      portalPasswordHash: hash,
      portalLastLoginAt: new Date(),
    },
  })

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: contact.organizationId,
        action: "portal_register",
        entityType: "contact",
        entityId: contact.id,
        entityName: contact.fullName,
        details: { ip: req.headers.get("x-forwarded-for") || "unknown" },
      },
    })
  } catch { /* non-critical */ }

  // Auto-login after registration
  const portalUser = {
    contactId: contact.id,
    organizationId: contact.organizationId,
    companyId: contact.companyId,
    fullName: contact.fullName,
    email: contact.email!,
  }

  const token = await createPortalToken(portalUser)

  const res = NextResponse.json({
    success: true,
    data: {
      contactId: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      companyName: contact.company?.name || "",
    },
  })
  res.cookies.set("portal-token", token, { httpOnly: true, path: "/", maxAge: 86400 * 7, sameSite: "lax" })
  return res
}
