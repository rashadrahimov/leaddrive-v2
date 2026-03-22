import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import bcrypt from "bcryptjs"

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  role: z.enum(["admin", "manager", "agent", "viewer"]).optional(),
  phone: z.string().max(50).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const user = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, department: true, isActive: true,
        lastLogin: true, loginCount: true, totpEnabled: true,
        createdAt: true, updatedAt: true,
      },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: user })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Verify user belongs to org
    const existing = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Check email uniqueness if changing
    if (parsed.data.email && parsed.data.email !== existing.email) {
      const dup = await prisma.user.findFirst({
        where: { organizationId: orgId, email: parsed.data.email, id: { not: id } },
      })
      if (dup) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }

    const updateData: Record<string, any> = {}
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone
    if (parsed.data.department !== undefined) updateData.department = parsed.data.department
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive
    if (parsed.data.password) {
      updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, department: true, isActive: true, createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const user = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
