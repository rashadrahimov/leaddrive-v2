import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const sections = await prisma.budgetSection.findMany({
    where: { planId, organizationId: orgId },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json({ success: true, data: sections })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { planId, name, sectionType, sortOrder } = body

  if (!planId || !name) {
    return NextResponse.json({ error: "planId and name are required" }, { status: 400 })
  }

  const section = await prisma.budgetSection.create({
    data: {
      organizationId: orgId,
      planId,
      name,
      sectionType: sectionType || "expense",
      sortOrder: sortOrder ?? 0,
    },
  })

  return NextResponse.json({ success: true, data: section }, { status: 201 })
}
