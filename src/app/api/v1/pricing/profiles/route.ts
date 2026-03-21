import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get("groupId")
  const companyId = searchParams.get("companyId")
  const search = searchParams.get("search")
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = parseInt(searchParams.get("limit") || "100", 10)
  const all = searchParams.get("all") === "true"

  const where: any = { organizationId: orgId }
  if (groupId) where.groupId = groupId
  if (companyId) where.companyId = companyId
  if (search) where.companyCode = { contains: search, mode: "insensitive" }

  const [profiles, total] = await Promise.all([
    prisma.pricingProfile.findMany({
      where,
      include: {
        group: true,
        company: { select: { id: true, name: true } },
        categories: {
          include: {
            category: true,
            services: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { category: { sortOrder: "asc" } },
        },
        _count: { select: { additionalSales: true } },
      },
      orderBy: [{ group: { sortOrder: "asc" } }, { companyCode: "asc" }],
      ...(all ? {} : { skip: (page - 1) * limit, take: limit }),
    }),
    prisma.pricingProfile.count({ where }),
  ])

  return NextResponse.json({ success: true, data: { profiles, total, page, limit } })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { companyCode, companyId, groupId, monthlyTotal, annualTotal } = body

    if (!companyCode || !groupId) {
      return NextResponse.json({ error: "companyCode and groupId are required" }, { status: 400 })
    }

    const profile = await prisma.pricingProfile.create({
      data: {
        organizationId: orgId,
        companyCode,
        companyId: companyId || null,
        groupId,
        monthlyTotal: monthlyTotal || 0,
        annualTotal: annualTotal || 0,
      },
      include: { group: true, company: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ success: true, data: profile }, { status: 201 })
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Profile with this companyCode already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || "Failed to create profile" }, { status: 500 })
  }
}
