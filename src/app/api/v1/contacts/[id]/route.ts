import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { getSession } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"
import { executeWorkflows } from "@/lib/workflow-engine"
import { fireWebhooks } from "@/lib/webhooks"

const updateContactSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  phones: z.array(z.string().max(50)).optional(),
  position: z.string().max(200).optional(),
  companyId: z.string().optional(),
  source: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  portalAccessEnabled: z.boolean().optional(),
  preferredLanguage: z.enum(["ru", "en", "az"]).nullable().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const { id } = await params

  try {
    const contact = await prisma.contact.findFirst({
      where: { id, organizationId: orgId },
      include: {
        company: { select: { id: true, name: true } },
        activities: { where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 20 },
      },
    })
    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const fieldPerms = await getFieldPermissions(orgId, role, "contact")
    const filtered = filterEntityFields(contact, fieldPerms, role)
    return NextResponse.json({ success: true, data: filtered })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const { id } = await params
  const body = await req.json()
  const parsed = updateContactSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const writableData = filterWritableFields(parsed.data, await getFieldPermissions(orgId, role, "contact"), role)
    const result = await prisma.contact.updateMany({ where: { id, organizationId: orgId }, data: writableData })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const updated = await prisma.contact.findFirst({ where: { id, organizationId: orgId } })
    logAudit(orgId, "update", "contact", id, updated?.fullName || "", { newValue: parsed.data })
    if (updated) {
      executeWorkflows(orgId, "contact", "updated", updated).catch(() => {})
      fireWebhooks(orgId, "contact.updated", { id: updated.id, fullName: updated.fullName, email: updated.email }).catch(() => {})
    }
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const existing = await prisma.contact.findFirst({ where: { id, organizationId: orgId }, select: { fullName: true } })
    const result = await prisma.contact.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    logAudit(orgId, "delete", "contact", id, existing?.fullName || "")
    fireWebhooks(orgId, "contact.deleted", { id, fullName: existing?.fullName }).catch(() => {})
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
