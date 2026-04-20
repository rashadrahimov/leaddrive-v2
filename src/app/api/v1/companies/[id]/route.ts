import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"

const updateCompanySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["active", "inactive", "prospect"]).optional(),
  category: z.string().optional(),
  leadStatus: z.string().optional(),
  leadScore: z.number().optional(),
  leadTemperature: z.string().optional(),
  userCount: z.number().optional(),
  annualRevenue: z.number().optional(),
  slaPolicyId: z.string().nullable().optional(),
  creditLimit: z.number().nullable().optional(),
  creditCurrency: z.string().max(10).nullable().optional(),
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
    const company = await prisma.company.findFirst({
      where: { id, organizationId: orgId },
      include: {
        contacts: { where: { organizationId: orgId }, orderBy: { fullName: "asc" } },
        deals: { where: { organizationId: orgId }, orderBy: { createdAt: "desc" } },
        contracts: { where: { organizationId: orgId }, orderBy: { createdAt: "desc" } },
        activities: { where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 20 },
        slaPolicy: { select: { id: true, name: true, priority: true, resolutionHours: true, firstResponseHours: true } },
      },
    })
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const fieldPerms = await getFieldPermissions(orgId, role, "company")
    const filtered = filterEntityFields(company, fieldPerms, role)
    return NextResponse.json({ success: true, data: filtered })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
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
  const parsed = updateCompanySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const fieldPerms = await getFieldPermissions(orgId, role, "company")
    const allowedData = filterWritableFields(parsed.data || body, fieldPerms, role)
    const company = await prisma.company.updateMany({
      where: { id, organizationId: orgId },
      data: allowedData,
    })
    if (company.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const updated = await prisma.company.findFirst({ where: { id, organizationId: orgId } })
    logAudit(orgId, "update", "company", id, updated?.name || "", { newValue: parsed.data })
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
    const existing = await prisma.company.findFirst({ where: { id, organizationId: orgId }, select: { name: true } })
    const result = await prisma.company.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    logAudit(orgId, "delete", "company", id, existing?.name || "")
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
