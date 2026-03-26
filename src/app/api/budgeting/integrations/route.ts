import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — list accounting integrations
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const integrations = await prisma.accountingIntegration.findMany({
    where: { organizationId: orgId },
    include: { imports: { take: 5, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(integrations)
}

// POST — create a new integration
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { provider, name, config, categoryMapping } = body

  if (!provider || !name) {
    return NextResponse.json({ error: "provider and name are required" }, { status: 400 })
  }

  const integration = await prisma.accountingIntegration.create({
    data: {
      organizationId: orgId,
      provider,
      name,
      config: config || {},
      categoryMapping: categoryMapping || {},
    },
  })

  return NextResponse.json(integration, { status: 201 })
}

// DELETE — remove integration
export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  await prisma.accountingIntegration.deleteMany({
    where: { id, organizationId: orgId },
  })

  return NextResponse.json({ success: true })
}
