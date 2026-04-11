import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { checkUserLimit } from "@/lib/plan-limits"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req, "settings", "read")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, department: true, isActive: true,
        totpEnabled: true, require2fa: true, lastLogin: true, loginCount: true,
        skills: true, maxTickets: true, isAvailable: true, createdAt: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (e) {
    console.error("Users GET error:", e)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "settings", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId

  try {
    const body = await req.json()
    const { name, email, password, role, department, phone, isActive, skills, maxTickets } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 })
    }

    // Check plan user limit
    const limitCheck = await checkUserLimit(orgId)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 })
    }

    // Check if email already exists in org
    const existing = await prisma.user.findFirst({
      where: { organizationId: orgId, email },
    })
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        name,
        email,
        passwordHash,
        role: role || "sales",
        department: department || null,
        phone: phone || null,
        isActive: isActive !== false,
        skills: skills || [],
        maxTickets: maxTickets || 10,
      },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, department: true, isActive: true, createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (e) {
    console.error("Users POST error:", e)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
