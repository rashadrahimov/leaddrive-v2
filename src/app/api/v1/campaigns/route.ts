import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(["email", "sms"]).optional(),
  status: z.enum(["draft", "scheduled", "sending", "sent", "cancelled"]).optional(),
  subject: z.string().optional(),
  templateId: z.string().optional(),
  scheduledAt: z.string().optional(),
  totalRecipients: z.number().optional(),
  budget: z.number().optional(),
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
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(status ? { status } : {}),
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.campaign.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { campaigns, total, page, limit, search },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { campaigns: [], total: 0, page, limit, search },
    })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const campaign = await prisma.campaign.create({
      data: { organizationId: orgId, ...parsed.data },
    })
    return NextResponse.json({ success: true, data: campaign }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
