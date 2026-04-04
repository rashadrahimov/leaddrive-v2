import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId, requireAuth } from "@/lib/api-auth"

const createActivitySchema = z.object({
  type: z.string().min(1),
  subject: z.string().min(1).max(500),
  description: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  relatedType: z.string().optional(),
  relatedId: z.string().optional(),
  scheduledAt: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get("companyId")
  const contactId = searchParams.get("contactId")
  const relatedType = searchParams.get("relatedType")
  const relatedId = searchParams.get("relatedId")

  try {
    const where: any = {
      organizationId: orgId,
      ...(companyId ? { companyId } : {}),
      ...(contactId ? { contactId } : {}),
      ...(relatedType ? { relatedType } : {}),
      ...(relatedId ? { relatedId } : {}),
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        contact: { select: { fullName: true } },
        company: { select: { name: true } },
      },
    })

    // Resolve createdBy user names
    const userIds = [...new Set(activities.map(a => a.createdBy).filter(Boolean))] as string[]
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds }, organizationId: orgId },
          select: { id: true, name: true },
        })
      : []
    const userMap = Object.fromEntries(users.map(u => [u.id, u.name]))

    const enriched = activities.map(a => ({
      ...a,
      createdByName: a.createdBy ? userMap[a.createdBy] || null : null,
    }))

    return NextResponse.json({ success: true, data: { activities: enriched } })
  } catch {
    return NextResponse.json({ success: true, data: { activities: [] } })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const parsed = createActivitySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const activity = await prisma.activity.create({
      data: {
        organizationId: auth.orgId,
        createdBy: auth.userId,
        ...parsed.data,
        ...(parsed.data.scheduledAt ? { scheduledAt: new Date(parsed.data.scheduledAt) } : {}),
      },
    })
    return NextResponse.json({ success: true, data: activity }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
