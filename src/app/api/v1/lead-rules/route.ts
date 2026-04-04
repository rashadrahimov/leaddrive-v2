import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  method: z.enum(["round_robin", "condition"]).default("condition"),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).max(1000).default(50),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string(),
  })).default([]),
  assignees: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rules = await prisma.leadAssignmentRule.findMany({
    where: { organizationId: orgId },
    orderBy: { priority: "asc" },
  })

  return NextResponse.json({ success: true, data: rules })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const rule = await prisma.leadAssignmentRule.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      method: parsed.data.method,
      isActive: parsed.data.isActive,
      priority: parsed.data.priority,
      conditions: parsed.data.conditions,
      assignees: parsed.data.assignees,
    },
  })

  return NextResponse.json({ success: true, data: rule })
}
