import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { requireAuth, isAuthError, getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const ruleSchema = z.object({
  name: z.string().min(1).max(200),
  triggerType: z.string().max(50),
  percentage: z.number().min(0).max(100).optional(),
  fixedAmount: z.number().min(0).max(999999999).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: fundId } = await params

  const rules = await prisma.fundRule.findMany({
    where: { fundId, organizationId: orgId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ data: rules })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: fundId } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = ruleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { name, triggerType, percentage, fixedAmount } = parsed.data

  const rule = await prisma.fundRule.create({
    data: {
      organizationId: orgId,
      fundId,
      name,
      triggerType,
      percentage: percentage ?? null,
      fixedAmount: fixedAmount ?? null,
    },
  })

  return NextResponse.json({ data: rule }, { status: 201 })
}

const updateRuleSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200).optional(),
  triggerType: z.string().max(50).optional(),
  percentage: z.union([z.string(), z.number().min(0).max(100)]).optional().nullable(),
  fixedAmount: z.union([z.string(), z.number().min(0).max(999999999)]).optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, "finance", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let data
  try {
    data = updateRuleSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { id, name, triggerType, percentage, fixedAmount, isActive } = data

  const rule = await prisma.fundRule.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(triggerType !== undefined && { triggerType }),
      ...(percentage !== undefined && { percentage: percentage ? parseFloat(percentage) : null }),
      ...(fixedAmount !== undefined && { fixedAmount: fixedAmount ? parseFloat(fixedAmount) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json({ data: rule })
}

export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req, "finance", "delete")
  if (isAuthError(authResult)) return authResult

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { id } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await prisma.fundRule.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
