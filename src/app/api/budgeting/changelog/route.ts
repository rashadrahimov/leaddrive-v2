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

function buildSummary(group: Array<{ action: string; entityType: string; field?: string | null; snapshot?: any }>): string {
  const creates = group.filter(c => c.action === "create")
  const updates = group.filter(c => c.action === "update")
  const deletes = group.filter(c => c.action === "delete")
  const parts: string[] = []
  if (creates.length) parts.push(`${creates.length} added`)
  if (updates.length) parts.push(`${updates.length} updated`)
  if (deletes.length) parts.push(`${deletes.length} deleted`)

  // Add category names for context (max 3)
  const categories = new Set<string>()
  for (const c of group) {
    const cat = (c.snapshot as any)?.category
    if (cat) categories.add(cat)
  }
  const catList = Array.from(categories).slice(0, 3)
  if (catList.length > 0) {
    const suffix = categories.size > 3 ? ` +${categories.size - 3} more` : ""
    return (parts.join(", ") || "No changes") + " — " + catList.join(", ") + suffix
  }

  return parts.join(", ") || "No changes"
}
