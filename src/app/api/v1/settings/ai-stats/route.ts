import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const MINUTES_PER_ACTION: Record<string, number> = {
  ai_auto_payment_reminder_shadow: 5,
  ai_auto_payment_reminder: 5,
  ai_auto_acknowledge_shadow: 3,
  ai_auto_acknowledge: 3,
  ai_auto_followup_shadow: 2,
  ai_auto_followup: 2,
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [approved, rejected, pending] = await Promise.all([
    prisma.aiShadowAction.findMany({
      where: { organizationId: orgId, approved: true, reviewedAt: { gte: monthStart } },
      select: { featureName: true },
    }),
    prisma.aiShadowAction.count({
      where: { organizationId: orgId, approved: false, reviewedAt: { gte: monthStart } },
    }),
    prisma.aiShadowAction.count({
      where: { organizationId: orgId, approved: null },
    }),
  ])

  const byFeature: Record<string, number> = {}
  let minutesSaved = 0
  for (const a of approved) {
    byFeature[a.featureName] = (byFeature[a.featureName] || 0) + 1
    minutesSaved += MINUTES_PER_ACTION[a.featureName] || 2
  }

  return NextResponse.json({
    data: {
      approvedThisMonth: approved.length,
      rejectedThisMonth: rejected,
      pending,
      minutesSaved,
      byFeature,
    },
  })
}
