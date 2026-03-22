import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import bcrypt from "bcryptjs"

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(["admin", "manager", "agent", "viewer"]).optional(),
  phone: z.string().max(50).optional(),
  department: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        department: true,
        isActive: true,
        lastLogin: true,
        loginCount: true,
        totpEnabled: true,
        createdAt: true,
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
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Check for duplicate email
    const existing = await prisma.user.findFirst({
      where: { organizationId: orgId, email: parsed.data.email },
    })
    if (existing) return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role || "viewer",
        phone: parsed.data.phone || null,
        department: parsed.data.department || null,
        isActive: parsed.data.isActive ?? true,
      },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, department: true, isActive: true, createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: user }, { status: 201 })
  } catch (e) {
    console.error("Users POST error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
