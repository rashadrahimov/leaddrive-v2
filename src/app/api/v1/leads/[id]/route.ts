import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"
import { executeWorkflows } from "@/lib/workflow-engine"
import { fireWebhooks } from "@/lib/webhooks"
import { createNotification } from "@/lib/notifications"

const updateLeadSchema = z.object({
  contactName: z.string().min(1).max(255).optional(),
  companyName: z.string().nullable().optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  score: z.number().optional(),
  assignedTo: z.string().nullable().optional(),
  estimatedValue: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const { id } = await params

  try {
    const lead = await prisma.lead.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const fieldPerms = await getFieldPermissions(orgId, role, "lead")
    const filteredLead = filterEntityFields(lead, fieldPerms, role)
    return NextResponse.json({ success: true, data: filteredLead })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const { id } = await params
  const body = await req.json()
  const parsed = updateLeadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const fieldPerms = await getFieldPermissions(orgId, role, "lead")
    const writableData = filterWritableFields(parsed.data, fieldPerms, role)
    const result = await prisma.lead.updateMany({
      where: { id, organizationId: orgId },
      data: writableData,
    })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const updated = await prisma.lead.findFirst({ where: { id, organizationId: orgId } })
    logAudit(orgId, "update", "lead", id, updated?.contactName || "", { newValue: parsed.data })
    if (updated) {
      const triggerEvent = parsed.data.status ? "status_changed" : "updated"
      executeWorkflows(orgId, "lead", triggerEvent, updated).catch(() => {})

      if (parsed.data.status) {
        createNotification({
          organizationId: orgId,
          type: parsed.data.status === "converted" ? "success" : parsed.data.status === "lost" ? "warning" : "info",
          title: parsed.data.status === "converted" ? "Лид конвертирован!" : "Смена статуса лида",
          message: `Лид «${updated.contactName}»: статус → ${parsed.data.status}`,
          entityType: "lead",
          entityId: id,
        }).catch(() => {})
      }
    }
    if (updated) {
      fireWebhooks(orgId, "lead.updated", { id: updated.id, contactName: updated.contactName }).catch(() => {})
    }
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
    const existing = await prisma.lead.findFirst({ where: { id, organizationId: orgId }, select: { contactName: true } })
    const result = await prisma.lead.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    logAudit(orgId, "delete", "lead", id, existing?.contactName || "")
    fireWebhooks(orgId, "lead.deleted", { id, contactName: existing?.contactName }).catch(() => {})
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
