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
    orderBy: { createdAt: "asc" },
  })

  // Group changes into time points (by minute)
  const timePointMap = new Map<string, typeof changes>()
  for (const c of changes) {
    const key = new Date(c.createdAt).toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
    const arr = timePointMap.get(key) || []
    arr.push(c)
    timePointMap.set(key, arr)
  }

  const timePoints = Array.from(timePointMap.entries()).map(([timestamp, group]) => ({
    timestamp,
    changeCount: group.length,
    summary: buildSummary(group),
  }))

  return NextResponse.json({ success: true, data: { changes, timePoints } })
}

function buildSummary(group: Array<{ action: string; entityType: string; field?: string | null }>): string {
  const creates = group.filter(c => c.action === "create").length
  const updates = group.filter(c => c.action === "update").length
  const deletes = group.filter(c => c.action === "delete").length
  const parts: string[] = []
  if (creates) parts.push(`${creates} added`)
  if (updates) parts.push(`${updates} updated`)
  if (deletes) parts.push(`${deletes} deleted`)
  return parts.join(", ") || "No changes"
}
