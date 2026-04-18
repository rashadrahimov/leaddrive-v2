import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

const updateSchema = z.object({
  displayName: z.string().max(200).optional(),
  keywords: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "campaigns", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const existing = await prisma.socialAccount.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const updated = await prisma.socialAccount.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "campaigns", "delete")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params
  const existing = await prisma.socialAccount.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.socialAccount.delete({ where: { id } })
  logAudit(orgId, "delete", "social_account", id, `${existing.platform}:${existing.handle}`)
  return NextResponse.json({ success: true })
}
