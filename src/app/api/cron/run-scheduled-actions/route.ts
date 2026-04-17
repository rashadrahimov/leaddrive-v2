import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runScheduledAction } from "@/lib/workflow-engine"

/**
 * Scheduled-actions runner cron.
 *
 * Picks up workflow actions that were deferred via `delayMinutes > 0`
 * (typically missed-call → SMS with 2-min delay per TT §9).
 *
 * Wire to external cron every minute:
 *   curl -X POST https://app.leaddrivecrm.org/api/cron/run-scheduled-actions \
 *        -H "x-cron-secret: $CRON_SECRET"
 *
 * Batches 100 ready rows per tick. Rows that error are kept with their
 * error message and attempts incremented — up to 3 attempts before giving up.
 */

const BATCH_SIZE = 100
const MAX_ATTEMPTS = 3

export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "")
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  const ready = await prisma.scheduledAction.findMany({
    where: {
      executedAt: null,
      scheduledAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { scheduledAt: "asc" },
    take: BATCH_SIZE,
  })

  let executed = 0
  let failed = 0

  for (const row of ready) {
    try {
      await runScheduledAction(
        row.organizationId,
        row.entityType,
        row.actionType,
        (row.actionConfig as any) || {},
        (row.entitySnapshot as any) || {}
      )
      await prisma.scheduledAction.update({
        where: { id: row.id },
        data: { executedAt: new Date(), attempts: { increment: 1 } },
      })
      executed++
    } catch (e) {
      failed++
      await prisma.scheduledAction.update({
        where: { id: row.id },
        data: {
          error: (e as Error).message?.slice(0, 500) || "Unknown error",
          attempts: { increment: 1 },
        },
      })
    }
  }

  return NextResponse.json({ success: true, picked: ready.length, executed, failed })
}
