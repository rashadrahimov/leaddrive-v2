import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createOfferSchema = z.object({
  offerNumber: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  companyId: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  totalAmount: z.number().optional(),
  currency: z.string().optional(),
  validUntil: z.string().optional(),
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
    const where = {
      organizationId: orgId,
      ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
      ...(status ? { status } : {}),
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.offer.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { offers, total, page, limit, search },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { offers: [], total: 0, page, limit, search },
    })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createOfferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const offer = await prisma.offer.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
      },
    })
    return NextResponse.json({ success: true, data: offer }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
