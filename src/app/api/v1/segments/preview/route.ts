import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const conditions = body.conditions || {}

  try {
    const where: any = { organizationId: orgId }
    const AND: any[] = []

    if (conditions.company && conditions.company.trim()) {
      AND.push({ company: { name: { contains: conditions.company, mode: "insensitive" } } })
    }
    if (conditions.source && conditions.source !== "") {
      AND.push({ source: conditions.source })
    }
    if (conditions.role && conditions.role.trim()) {
      AND.push({ position: { contains: conditions.role, mode: "insensitive" } })
    }
    if (conditions.tag && conditions.tag.trim()) {
      AND.push({ tags: { has: conditions.tag } })
    }
    if (conditions.createdAfter) {
      AND.push({ createdAt: { gte: new Date(conditions.createdAfter) } })
    }
    if (conditions.createdBefore) {
      AND.push({ createdAt: { lte: new Date(conditions.createdBefore) } })
    }
    if (conditions.name && conditions.name.trim()) {
      AND.push({ fullName: { contains: conditions.name, mode: "insensitive" } })
    }
    if (conditions.hasEmail) {
      AND.push({ email: { not: null } })
      AND.push({ NOT: { email: "" } })
    }
    if (conditions.hasPhone) {
      AND.push({ phone: { not: null } })
      AND.push({ NOT: { phone: "" } })
    }

    if (AND.length > 0) {
      where.AND = AND
    }

    const count = await prisma.contact.count({ where })
    return NextResponse.json({ success: true, data: { count } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
