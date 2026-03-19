import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(500).optional(),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  category: z.string().optional(),
  variables: z.string().optional(),
  language: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: template })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateTemplateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const result = await prisma.emailTemplate.updateMany({
      where: { id, organizationId: orgId },
      data: parsed.data,
    })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const updated = await prisma.emailTemplate.findFirst({ where: { id, organizationId: orgId } })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const result = await prisma.emailTemplate.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
