import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"
import { applyLeadAssignmentRules } from "@/lib/lead-assignment"
import { fireWebhooks } from "@/lib/webhooks"

const createLeadSchema = z.object({
  contactName: z.string().min(1).max(200),
  companyName: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  source: z.string().max(50).optional(),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  estimatedValue: z.number().min(0).optional(),
  notes: z.string().max(5000).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  const status = searchParams.get("status")
  const includeConverted = searchParams.get("includeConverted") === "true"

  try {
    let where: any = {
      organizationId: orgId,
      ...(search ? {
        OR: [
          { contactName: { contains: search, mode: "insensitive" as const } },
          { companyName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
      ...(status ? { status } : includeConverted ? {} : { status: { not: "converted" } }),
    }

    where = await applyRecordFilter(orgId, session?.userId || "", role, "lead", where)

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({ where }),
    ])

    const fieldPerms = await getFieldPermissions(orgId, role, "lead")
    const filteredLeads = leads.map((l: any) => filterEntityFields(l, fieldPerms, role))

    return NextResponse.json({ success: true, data: { leads: filteredLeads, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { leads: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"
  const body = await req.json()
  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const writableData = filterWritableFields(parsed.data, await getFieldPermissions(orgId, role, "lead"), role)
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        contactName: writableData.contactName ?? parsed.data.contactName,
        companyName: writableData.companyName ?? parsed.data.companyName,
        email: writableData.email || parsed.data.email || null,
        phone: writableData.phone ?? parsed.data.phone,
        source: writableData.source ?? parsed.data.source,
        status: writableData.status || parsed.data.status || "new",
        priority: writableData.priority || parsed.data.priority || "medium",
        estimatedValue: writableData.estimatedValue ?? parsed.data.estimatedValue,
        notes: writableData.notes ?? parsed.data.notes,
      },
    })
    logAudit(orgId, "create", "lead", lead.id, lead.contactName)
    applyLeadAssignmentRules(orgId, lead).catch(() => {})
    executeWorkflows(orgId, "lead", "created", lead).catch(() => {})
    createNotification({
      organizationId: orgId,
      type: "info",
      title: "Новый лид",
      message: `Создан лид «${lead.contactName}»${lead.companyName ? ` (${lead.companyName})` : ""}`,
      entityType: "lead",
      entityId: lead.id,
    }).catch(() => {})
    fireWebhooks(orgId, "lead.created", { id: lead.id, contactName: lead.contactName, companyName: lead.companyName }).catch(() => {})
    return NextResponse.json({ success: true, data: lead }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
