/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const changes = await prisma.budgetChangeLog.findMany({
    where: { planId, organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  // Resolve user names
  const userIds = [...new Set(changes.map(c => c.userId).filter(Boolean))] as string[]
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
    : []
  const userMap = new Map(users.map(u => [u.id, u.name || "Unknown"]))

  const items = changes.map(c => ({
    id: c.id,
    action: c.action,
    entityType: c.entityType,
    entityId: c.entityId,
    field: c.field,
    oldValue: c.oldValue,
    newValue: c.newValue,
    category: (c.snapshot as any)?.category || null,
    userName: c.userId ? (userMap.get(c.userId) || "Unknown") : "System",
    createdAt: c.createdAt.toISOString(),
  }))

  return NextResponse.json({ success: true, data: { items, total: items.length } })
}

/**
 * POST /api/budgeting/changelog — Undo a specific change
 * Body: { changeId: string }
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { changeId } = body
  if (!changeId) return NextResponse.json({ error: "changeId required" }, { status: 400 })

  const change = await prisma.budgetChangeLog.findFirst({
    where: { id: changeId, organizationId: orgId },
  })
  if (!change) return NextResponse.json({ error: "Change not found" }, { status: 404 })

  // Only support undo for field updates on lines
  if (change.action !== "update" || change.entityType !== "line" || !change.field || change.oldValue == null) {
    return NextResponse.json({ error: "Only field updates can be undone" }, { status: 400 })
  }

  // Revert the field to oldValue
  const oldVal = change.oldValue as any
  await prisma.budgetLine.update({
    where: { id: change.entityId },
    data: { [change.field]: typeof oldVal === "object" ? oldVal : Number(oldVal) },
  })

  // Delete the changelog entry
  await prisma.budgetChangeLog.delete({ where: { id: changeId } })

  return NextResponse.json({ success: true, data: { reverted: change.field, to: oldVal } })
}
