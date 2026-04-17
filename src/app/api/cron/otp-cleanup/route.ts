import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * OTP cleanup cron.
 *
 * Deletes OTP records that are either:
 *   - past their `expiresAt` (never verified, now stale), OR
 *   - already used (`usedAt != null`) and older than 7 days (keep recent for audit)
 *
 * Should be wired to external cron every 6 hours:
 *   curl -X POST https://app.leaddrivecrm.org/api/cron/otp-cleanup \
 *        -H "x-cron-secret: $CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "")
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const AUDIT_WINDOW_DAYS = 7
  const auditCutoff = new Date(now.getTime() - AUDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  try {
    const [expired, usedOld] = await Promise.all([
      prisma.otpCode.deleteMany({
        where: { expiresAt: { lt: now }, usedAt: null },
      }),
      prisma.otpCode.deleteMany({
        where: { usedAt: { not: null, lt: auditCutoff } },
      }),
    ])

    return NextResponse.json({
      success: true,
      deletedExpired: expired.count,
      deletedUsedOld: usedOld.count,
      auditWindowDays: AUDIT_WINDOW_DAYS,
    })
  } catch (e) {
    console.error("[cron/otp-cleanup]", e)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}
