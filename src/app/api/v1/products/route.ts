import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default("service"),
  price: z.number().default(0),
  currency: z.string().default("AZN"),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const products = await prisma.product.findMany({
    where: { organizationId: orgId },
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ success: true, data: products })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const product = await prisma.product.create({
    data: { ...parsed.data, organizationId: orgId },
  })

  return NextResponse.json({ success: true, data: product }, { status: 201 })
}
