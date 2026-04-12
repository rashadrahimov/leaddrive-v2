import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createContractSchema = z.object({
  contractNumber: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(["draft", "sent", "signed", "active", "expiring", "expired", "renewed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  valueAmount: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const status = searchParams.get("status")

  try {
    const companyId = searchParams.get("companyId")
    const where = {
      organizationId: orgId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
      ...(status ? { status } : {}),
      ...(companyId ? { companyId } : {}),
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true } },
          contact: { select: { id: true, fullName: true } },
        },
      }),
      prisma.contract.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { contracts, total, page, limit, search },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { contracts: [], total: 0, page, limit, search },
    })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createContractSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const contract = await prisma.contract.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      },
      include: {
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
      },
    })
    return NextResponse.json({ success: true, data: contract }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
