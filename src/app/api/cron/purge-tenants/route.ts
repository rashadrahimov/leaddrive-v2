import { NextRequest, NextResponse } from "next/server"
import { purgeScheduledTenants } from "@/lib/tenant-provisioning"
import { exportTenantData } from "@/lib/tenant-export"
import { prisma } from "@/lib/prisma"

// POST /api/cron/purge-tenants — Purge tenants past their deletion date
// Secured by cron secret (same pattern as other cron endpoints)
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find overdue tenants
  const overdue = await prisma.organization.findMany({
    where: { deletionScheduledAt: { lte: new Date() } },
    select: { id: true, name: true, slug: true },
  })

  if (overdue.length === 0) {
    return NextResponse.json({ message: "No tenants to purge", purged: 0 })
  }

  // Export data before purging (best-effort for each)
  for (const org of overdue) {
    try {
      const exportResult = await exportTenantData(org.id)
      console.log(`[CRON] Exported "${org.name}" data before purge: ${exportResult.filename}`)
    } catch (err) {
      console.error(`[CRON] Export failed for "${org.name}" before purge:`, err)
    }
  }

  // Purge
  const result = await purgeScheduledTenants()

  console.log(`[CRON] Purge complete: ${result.purged.length} deleted, ${result.errors.length} errors`)

  return NextResponse.json({
    message: `Purged ${result.purged.length} tenant(s)`,
    purged: result.purged,
    errors: result.errors,
  })
}
