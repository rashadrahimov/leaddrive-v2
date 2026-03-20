import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processEnrollmentStep } from "@/lib/journey-engine"

/**
 * POST /api/v1/journeys/process
 * Process all pending journey enrollments where nextActionAt <= now.
 * Can be called by cron, webhook, or manually.
 */
export async function POST(req: NextRequest) {
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
  } catch (e: any) {
    console.error("[Journey Process Error]", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
