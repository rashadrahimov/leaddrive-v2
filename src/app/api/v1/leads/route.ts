import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

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
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  try {
    const where = {
      organizationId: orgId,
      ...(search ? { contactName: { contains: search, mode: "insensitive" as const } } : {}),
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { leads, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { leads: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const parsed = createLeadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const lead = await prisma.lead.create({
      data: {
        organizationId: orgId,
        contactName: parsed.data.contactName,
        companyName: parsed.data.companyName,
        email: parsed.data.email || null,
        phone: parsed.data.phone,
        source: parsed.data.source,
        status: parsed.data.status || "new",
        priority: parsed.data.priority || "medium",
        estimatedValue: parsed.data.estimatedValue,
        notes: parsed.data.notes,
      },
    })
    return NextResponse.json({ success: true, data: lead }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
