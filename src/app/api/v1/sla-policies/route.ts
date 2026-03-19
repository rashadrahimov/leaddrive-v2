import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createSlaPolicySchema = z.object({
  name: z.string().min(1).max(200),
  priority: z.string().min(1),
  firstResponseHours: z.number().positive(),
  resolutionHours: z.number().positive(),
  businessHoursOnly: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const policies = await prisma.slaPolicy.findMany({
      where: { organizationId: orgId },
      orderBy: { priority: "desc" },
    })

    return NextResponse.json({ success: true, data: policies })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSlaPolicySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const policy = await prisma.slaPolicy.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: policy }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
