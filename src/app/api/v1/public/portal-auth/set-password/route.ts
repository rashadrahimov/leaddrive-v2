import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createPortalToken } from "@/lib/portal-auth"
import bcrypt from "bcryptjs"

// GET /api/v1/public/portal-auth/set-password?token=xxx — validate token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ error: "Токен не указан" }, { status: 400 })

  const contact = await prisma.contact.findFirst({
    where: {
      portalVerificationToken: token,
      portalVerificationExpires: { gte: new Date() },
    },
    select: { id: true, fullName: true, email: true },
  })

  if (!contact) {
    return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 400 })
  }

  return NextResponse.json({ success: true, data: { fullName: contact.fullName, email: contact.email } })
}

// POST /api/v1/public/portal-auth/set-password — set password after verification
export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { token, password, confirmPassword } = body

  if (!token) return NextResponse.json({ error: "Токен не указан" }, { status: 400 })
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Пароль должен быть не менее 8 символов" }, { status: 400 })
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Пароли не совпадают" }, { status: 400 })
  }

  const contact = await prisma.contact.findFirst({
    where: {
      portalVerificationToken: token,
      portalVerificationExpires: { gte: new Date() },
    },
    include: { company: true },
  })

  if (!contact) {
    return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 400 })
  }

  if (contact.portalPasswordHash) {
    return NextResponse.json({ error: "Пароль уже установлен. Войдите через страницу входа." }, { status: 409 })
  }

  const hash = await bcrypt.hash(password, 12)

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      portalPasswordHash: hash,
      portalLastLoginAt: new Date(),
      portalVerificationToken: null,
      portalVerificationExpires: null,
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

  // Auto-login
  const portalUser = {
    contactId: contact.id,
    organizationId: contact.organizationId,
    companyId: contact.companyId,
    fullName: contact.fullName,
    email: contact.email!,
  }

  const jwtToken = await createPortalToken(portalUser)

  const res = NextResponse.json({
    success: true,
    data: {
      contactId: contact.id,
      fullName: contact.fullName,
      email: contact.email,
      companyName: contact.company?.name || "",
    },
  })
  res.cookies.set("portal-token", jwtToken, { httpOnly: true, secure: true, path: "/", maxAge: 86400 * 7, sameSite: "lax" })
  return res
}
