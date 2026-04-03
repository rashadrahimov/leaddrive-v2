import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/v1/api-keys/:id — revoke key
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "core", "delete")
  if (isAuthError(auth)) return auth
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Only admins can revoke API keys" }, { status: 403 })
  }

  const { id } = await params

  const key = await prisma.apiKey.findFirst({
    where: { id, organizationId: auth.orgId },
  })
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 })

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/v1/api-keys/:id — update key (rename, toggle active)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "core", "write")
  if (isAuthError(auth)) return auth
  if (auth.role !== "admin") {
    return NextResponse.json({ error: "Only admins can modify API keys" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const key = await prisma.apiKey.findFirst({
    where: { id, organizationId: auth.orgId },
  })
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 })

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.isActive !== undefined) data.isActive = body.isActive

  const updated = await prisma.apiKey.update({ where: { id }, data })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      name: updated.name,
      isActive: updated.isActive,
    },
  })
}
