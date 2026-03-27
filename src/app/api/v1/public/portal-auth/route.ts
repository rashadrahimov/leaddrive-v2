import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createPortalToken } from "@/lib/portal-auth"
import bcrypt from "bcryptjs"

// POST /api/v1/public/portal-auth — login with email + password
export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email) return NextResponse.json({ error: "Email обязателен" }, { status: 400 })
  if (!password) return NextResponse.json({ error: "Пароль обязателен" }, { status: 400 })

  const contact = await prisma.contact.findFirst({
    where: { email },
    include: { company: true },
  })
  if (!contact) return NextResponse.json({ error: "Контакт не найден" }, { status: 404 })

  if (!contact.portalAccessEnabled) {
    return NextResponse.json({ error: "Доступ к порталу не активирован. Обратитесь к администратору." }, { status: 403 })
  }

  if (!contact.portalPasswordHash) {
    return NextResponse.json({ error: "Аккаунт не зарегистрирован. Пройдите регистрацию." }, { status: 403 })
  }

  const valid = await bcrypt.compare(password, contact.portalPasswordHash)
  if (!valid) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 })
  }

  // Update last login
  await prisma.contact.update({
    where: { id: contact.id },
    data: { portalLastLoginAt: new Date() },
  })

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: contact.organizationId,
        action: "portal_login",
        entityType: "contact",
        entityId: contact.id,
        entityName: contact.fullName,
        details: { ip: req.headers.get("x-forwarded-for") || "unknown" },
      },
    })
  } catch { /* audit log is non-critical */ }

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
  res.cookies.set("portal-token", token, { httpOnly: true, secure: true, path: "/", maxAge: 86400 * 7, sameSite: "lax" })
  return res
}

// DELETE /api/v1/public/portal-auth — logout
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set("portal-token", "", { httpOnly: true, path: "/", maxAge: 0 })
  return res
}
