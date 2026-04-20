import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { getSession } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"
import { fireWebhooks } from "@/lib/webhooks"
import { checkContactLimit } from "@/lib/plan-limits"
import { trackContactEvent } from "@/lib/contact-events"

const createContactSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  position: z.string().max(200).optional(),
  companyId: z.string().optional(),
  source: z.string().max(50).optional(),
  brand: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  preferredLanguage: z.enum(["ru", "en", "az"]).nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const companyId = searchParams.get("companyId") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    let where: any = {
      organizationId: orgId,
      ...(search ? { fullName: { contains: search, mode: "insensitive" as const } } : {}),
      ...(companyId ? { companyId } : {}),
    }

    where = await applyRecordFilter(orgId, session?.userId || "", role, "contact", where)

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { fullName: "asc" },
        include: { company: { select: { id: true, name: true } } },
      }),
      prisma.contact.count({ where }),
    ])

    const fieldPerms = await getFieldPermissions(orgId, role, "contact")
    const filteredContacts = contacts.map((c: any) => filterEntityFields(c, fieldPerms, role))

    return NextResponse.json({ success: true, data: { contacts: filteredContacts, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { contacts: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const body = await req.json()
  const parsed = createContactSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Check plan contact limit
    const limitCheck = await checkContactLimit(orgId)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 })
    }

    const writableData = filterWritableFields(parsed.data, await getFieldPermissions(orgId, role, "contact"), role)
    const contact = await prisma.contact.create({ data: { organizationId: orgId, ...writableData } })
    logAudit(orgId, "create", "contact", contact.id, contact.fullName)
    executeWorkflows(orgId, "contact", "created", contact).catch(() => {})
    createNotification({
      organizationId: orgId,
      type: "info",
      title: "Новый контакт",
      message: `Добавлен контакт «${contact.fullName}»`,
      entityType: "contact",
      entityId: contact.id,
    }).catch(() => {})
    fireWebhooks(orgId, "contact.created", { id: contact.id, fullName: contact.fullName, email: contact.email }).catch(() => {})
    if (contact.source === "portal" || contact.source === "form" || contact.source === "website") {
      trackContactEvent(orgId, contact.id, "form_submitted", { source: contact.source }).catch(() => {})
    }
    return NextResponse.json({ success: true, data: contact }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
