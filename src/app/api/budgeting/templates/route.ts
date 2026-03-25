import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const templates = await prisma.budgetDirectionTemplate.findMany({
    where: { organizationId: orgId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ data: templates })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, description, lineType, lineSubtype, defaultAmount, unitPrice, unitCost, quantity, costModelKey, department } = body

  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const template = await prisma.budgetDirectionTemplate.create({
    data: {
      organizationId: orgId,
      name: name.trim(),
      description: description || null,
      lineType: lineType || "revenue",
      lineSubtype: lineSubtype || null,
      defaultAmount: Number(defaultAmount) || 0,
      unitPrice: unitPrice != null ? Number(unitPrice) : null,
      unitCost: unitCost != null ? Number(unitCost) : null,
      quantity: quantity != null ? Number(quantity) : null,
      costModelKey: costModelKey || null,
      department: department || null,
    },
  })

  return NextResponse.json({ data: template })
}
