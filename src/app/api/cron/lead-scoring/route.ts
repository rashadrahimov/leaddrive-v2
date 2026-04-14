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
      // Feature flag check — defaults to enabled (scoring is non-destructive)
      const enabled = await isAiFeatureEnabled(org.id, "ai_lead_scoring")
      // If feature not explicitly in the list, still run (it's a safe operation)
      // Only skip if explicitly disabled by NOT being in features when org has features set
      const orgData = await prisma.organization.findUnique({
        where: { id: org.id },
        select: { features: true },
      })
      const features = orgData?.features
      if (Array.isArray(features) && features.length > 0 && !features.includes("ai_lead_scoring")) {
        continue
      }

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
