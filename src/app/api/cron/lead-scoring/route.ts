import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isAiFeatureEnabled } from "@/lib/ai/budget"
import { recalculateOrgLeadScores } from "@/lib/ai/lead-scoring"

/**
 * Lead Scoring Cron Endpoint
 * Called by external cron (e.g. daily or every 6 hours)
 * Recalculates lead scores using enhanced heuristic model.
 */
export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let totalUpdated = 0

    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    for (const org of orgs) {
      // Skip if org has features configured but ai_lead_scoring is not among them
      const enabled = await isAiFeatureEnabled(org.id, "ai_lead_scoring")
      if (!enabled) continue

      const updated = await recalculateOrgLeadScores(org.id)
      totalUpdated += updated
    }

    return NextResponse.json({
      success: true,
      data: { totalUpdated, timestamp: new Date().toISOString() },
    })
  } catch (e) {
    console.error("Lead Scoring cron error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
