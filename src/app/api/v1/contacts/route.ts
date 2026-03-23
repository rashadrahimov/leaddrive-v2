import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { executeWorkflows } from "@/lib/workflow-engine"

const createContactSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  position: z.string().max(200).optional(),
  companyId: z.string().optional(),
  source: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const companyId = searchParams.get("companyId") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const where = {
      organizationId: orgId,
      ...(search ? { fullName: { contains: search, mode: "insensitive" as const } } : {}),
      ...(companyId ? { companyId } : {}),
    }

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

    return NextResponse.json({ success: true, data: { contacts, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { contacts: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createContactSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const contact = await prisma.contact.create({ data: { organizationId: orgId, ...parsed.data } })
    executeWorkflows(orgId, "contact", "created", contact).catch(() => {})
    return NextResponse.json({ success: true, data: contact }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
