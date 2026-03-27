import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

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

  const body = await req.json()
  const { name, description, targetAmount, currency, color } = body

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const fund = await prisma.fund.create({
    data: {
      organizationId: orgId,
      name,
      description: description || null,
      targetAmount: targetAmount ? parseFloat(targetAmount) : null,
      currency: currency || "AZN",
      color: color || null,
    },
  })

  return NextResponse.json({ data: fund }, { status: 201 })
}
