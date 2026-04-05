import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { prisma, logAudit } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const quota = await prisma.salesQuota.findFirst({
    where: { id, organizationId: session.orgId },
  })
  if (!quota) return NextResponse.json({ error: "Quota not found" }, { status: 404 })

  const updated = await prisma.salesQuota.update({
    where: { id },
    data: {
      amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
      currency: body.currency || undefined,
    },
  })

  logAudit(session.orgId, "update", "sales_quota", id, `Quota updated`)
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const quota = await prisma.salesQuota.findFirst({
    where: { id, organizationId: session.orgId },
  })
  if (!quota) return NextResponse.json({ error: "Quota not found" }, { status: 404 })

  await prisma.salesQuota.delete({ where: { id } })
  logAudit(session.orgId, "delete", "sales_quota", id, `Quota deleted`)

  return NextResponse.json({ success: true })
}
