import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { processEnrollmentStep } from "@/lib/journey-engine"

const CRON_SECRET = process.env.CRON_SECRET

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

/**
 * POST /api/v1/journeys/process
 * Process all pending journey enrollments where nextActionAt <= now.
 * Requires Authorization: Bearer <CRON_SECRET> header for security.
 */
export async function POST(req: NextRequest) {
  // Authenticate: require CRON_SECRET or valid session
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!CRON_SECRET) {
    console.error("[Journey Process] CRON_SECRET not configured")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }
  if (!token || !safeCompare(token, CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find all active enrollments ready to process
    const pendingEnrollments = await prisma.journeyEnrollment.findMany({
      where: {
        status: "active",
        nextActionAt: { lte: now },
        currentStepId: { not: null },
      },
      take: 50,
    })

    const results = []
    for (const enrollment of pendingEnrollments) {
      const result = await processEnrollmentStep(enrollment.id, enrollment.organizationId)
      results.push({
        enrollmentId: enrollment.id,
        journeyId: enrollment.journeyId,
        leadId: enrollment.leadId,
        contactId: enrollment.contactId,
        ...result,
      })
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (e) {
    console.error("[Journey Process Error]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
