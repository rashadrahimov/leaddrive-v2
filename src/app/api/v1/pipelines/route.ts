import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
  stages: z.array(z.object({
    name: z.string().min(1),
    displayName: z.string().min(1),
    color: z.string().default("#6366f1"),
    probability: z.number().int().min(0).max(100).default(0),
    sortOrder: z.number().int().default(0),
    isWon: z.boolean().default(false),
    isLost: z.boolean().default(false),
  })).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId: orgId as string },
    include: {
      stages: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      _count: { select: { deals: true } },
    },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
  })

  return NextResponse.json({ success: true, data: pipelines })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, isDefault, stages } = parsed.data

  // If setting as default, unset others
  if (isDefault) {
    await prisma.pipeline.updateMany({
      where: { organizationId: orgId as string, isDefault: true },
      data: { isDefault: false },
    })
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      organizationId: orgId as string,
      name,
      isDefault: isDefault || false,
      stages: stages ? {
        create: stages.map((s) => ({
          organizationId: orgId as string,
          ...s,
        })),
      } : undefined,
    },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
    },
  })

  return NextResponse.json({ success: true, data: pipeline }, { status: 201 })
}
