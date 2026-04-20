import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { createNotification } from "@/lib/notifications"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"

const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["active", "inactive", "prospect"]).optional(),
  slaPolicyId: z.string().nullable().optional(),
  creditLimit: z.number().nullable().optional(),
  creditCurrency: z.string().max(10).nullable().optional(),
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
  const category = searchParams.get("category") // client, partner, prospect, all

  try {
    let where: any = {
      organizationId: orgId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(category && category !== "all" ? { category } : { category: { not: "partner" } }),
    }

    // Apply record-level sharing rules
    where = await applyRecordFilter(orgId, session?.userId || "", role, "company", where)

    const baseWhere = { organizationId: orgId, category: { not: "partner" } }

    const [companies, total, agg] = await Promise.all([
      prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: { select: { contacts: true, deals: true, contracts: true } },
          slaPolicy: { select: { id: true, name: true, priority: true, resolutionHours: true } },
        },
      }),
      prisma.company.count({ where }),
      prisma.company.aggregate({
        where: baseWhere,
        _sum: { userCount: true },
        _count: true,
      }),
    ])

    // Apply field-level permissions
    const fieldPerms = await getFieldPermissions(orgId, role, "company")
    const filteredCompanies = companies.map((c: any) => filterEntityFields(c, fieldPerms, role))

    const totalUsers = agg._sum.userCount || 0
    const totalContacts = await prisma.contact.count({ where: { organizationId: orgId } })

    return NextResponse.json({
      success: true,
      data: { companies: filteredCompanies, total, page, limit, search, totalUsers, totalContacts },
    })
  } catch (e) {
    console.error("Companies API error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const body = await req.json()
  const parsed = createCompanySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    // Filter writable fields
    const fieldPerms = await getFieldPermissions(orgId, role, "company")
    const allowedData = filterWritableFields(parsed.data, fieldPerms, role)

    const company = await prisma.company.create({
      data: { organizationId: orgId, ...allowedData },
    })
    logAudit(orgId, "create", "company", company.id, company.name)
    createNotification({
      organizationId: orgId,
      type: "info",
      title: "Новая компания",
      message: `Добавлена компания «${company.name}»`,
      entityType: "company",
      entityId: company.id,
    }).catch(() => {})
    return NextResponse.json({ success: true, data: company }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
