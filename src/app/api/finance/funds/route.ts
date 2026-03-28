import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const fundSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetAmount: z.number().min(0).max(999999999).optional(),
  currency: z.string().max(10).default("AZN"),
  color: z.string().max(20).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const funds = await prisma.fund.findMany({
    where: { organizationId: orgId },
    include: { rules: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ data: funds })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = fundSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { name, description, targetAmount, currency, color } = parsed.data

  const fund = await prisma.fund.create({
    data: {
      organizationId: orgId,
      name,
      description: description || null,
      targetAmount: targetAmount ?? null,
      currency,
      color: color || null,
    },
  })

  return NextResponse.json({ data: fund }, { status: 201 })
}
