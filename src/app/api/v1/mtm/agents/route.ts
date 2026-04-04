import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || ""
  const role = searchParams.get("role") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")))

  try {
    const where: any = { organizationId: orgId }
    if (status) where.status = status
    if (role) where.role = role

    const [agents, total] = await Promise.all([
      prisma.mtmAgent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: { manager: { select: { id: true, name: true } } },
      }),
      prisma.mtmAgent.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { agents, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { agents: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const agent = await prisma.mtmAgent.create({
      data: {
        organizationId: orgId,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        role: body.role || "AGENT",
        managerId: body.managerId || null,
        userId: body.userId || null,
      },
    })
    return NextResponse.json({ success: true, data: agent }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create agent" }, { status: 400 })
  }
}
