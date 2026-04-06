import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import { processEnrollmentStep } from "@/lib/journey-engine"
import { checkGoal } from "@/lib/journey-goals"

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
      // Load journey for goal check
      const journey = await prisma.journey.findUnique({ where: { id: enrollment.journeyId } })

      // Check goals before processing step
      if (journey?.goalType && journey.exitOnGoal) {
        const goalReached = await checkGoal(enrollment, journey)
        if (goalReached) {
          await prisma.journeyEnrollment.update({
            where: { id: enrollment.id },
            data: {
              status: "completed",
              exitReason: "goal_reached",
              goalReachedAt: new Date(),
              completedAt: new Date(),
            },
          })
          await prisma.journey.update({
            where: { id: journey.id },
            data: { conversionCount: { increment: 1 }, activeCount: { decrement: 1 } },
          })
          results.push({ enrollmentId: enrollment.id, journeyId: enrollment.journeyId, status: "goal_reached" })
          continue
        }
      }

      // Check max enrollment days
      if (journey?.maxEnrollmentDays) {
        const enrolledDays = (now.getTime() - enrollment.enrolledAt.getTime()) / 86400000
        if (enrolledDays > journey.maxEnrollmentDays) {
          await prisma.journeyEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "completed", exitReason: "max_days", completedAt: new Date() },
          })
          await prisma.journey.update({
            where: { id: journey.id },
            data: { activeCount: { decrement: 1 }, completedCount: { increment: 1 } },
          })
          results.push({ enrollmentId: enrollment.id, journeyId: enrollment.journeyId, status: "max_days_exceeded" })
          continue
        }
      }

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
