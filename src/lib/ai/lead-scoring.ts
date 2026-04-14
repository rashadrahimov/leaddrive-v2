import { prisma } from "@/lib/prisma"

/**
 * Enhanced Lead Scoring — heuristic model (no ML, works with small datasets).
 * Factors: email quality, title seniority, company size, source conversion history,
 * engagement velocity, activity recency.
 * Score: 0-100, recalculated by cron.
 */

// Email domain quality tiers
const PREMIUM_DOMAINS = ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"]
const DISPOSABLE_PATTERNS = ["tempmail", "throwaway", "guerrilla", "mailinator", "yopmail", "10minute"]

// Title seniority keywords → points
const TITLE_SCORES: [RegExp, number][] = [
  [/\b(ceo|cto|cfo|coo|founder|owner|president|director|vp|vice.?president)\b/i, 20],
  [/\b(head|chief|partner|managing)\b/i, 15],
  [/\b(manager|lead|senior|principal)\b/i, 10],
  [/\b(specialist|engineer|developer|analyst|consultant)\b/i, 5],
]

function scoreEmail(email: string | null): number {
  if (!email) return -10
  const domain = email.split("@")[1]?.toLowerCase() || ""

  // Disposable email = negative signal
  if (DISPOSABLE_PATTERNS.some(p => domain.includes(p))) return -15

  // Corporate domain (not free provider) = strong signal
  if (!PREMIUM_DOMAINS.includes(domain)) return 10

  // Free provider = neutral
  return 0
}

function scoreTitle(title: string | null | undefined): number {
  if (!title) return 0
  for (const [pattern, points] of TITLE_SCORES) {
    if (pattern.test(title)) return points
  }
  return 0
}

function scoreEstimatedValue(value: number | null | undefined): number {
  if (!value || value <= 0) return 0
  if (value >= 100000) return 15
  if (value >= 50000) return 10
  if (value >= 10000) return 5
  return 2
}

export async function calculateLeadScore(
  orgId: string,
  lead: {
    id: string
    email: string | null
    contactName: string | null
    companyName: string | null
    source: string | null
    estimatedValue: number | null
    notes: string | null
    createdAt: Date
  },
): Promise<number> {
  let score = 30 // Base score

  // 1. Email quality
  score += scoreEmail(lead.email)

  // 2. Title seniority (extracted from contactName or notes)
  const titleText = `${lead.contactName || ""} ${lead.notes || ""}`
  score += scoreTitle(titleText)

  // 3. Estimated value
  score += scoreEstimatedValue(lead.estimatedValue)

  // 4. Company name present = signal of seriousness
  if (lead.companyName && lead.companyName.trim().length > 2) score += 5

  // 5. Source conversion history — how well does this source convert?
  if (lead.source) {
    const sourceStats = await prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: orgId, source: lead.source },
      _count: { id: true },
    })
    const converted = sourceStats.find((s: any) => s.status === "converted")?._count.id || 0
    const total = sourceStats.reduce((sum: number, s: any) => sum + s._count.id, 0)
    if (total >= 5) {
      const conversionRate = converted / total
      if (conversionRate >= 0.3) score += 10
      else if (conversionRate >= 0.1) score += 5
      else if (conversionRate < 0.05 && total > 20) score -= 5
    }
  }

  // 6. Activity / engagement velocity
  const activities = await prisma.activity.findMany({
    where: { organizationId: orgId, relatedType: "lead", relatedId: lead.id },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  const actCount = activities.length
  if (actCount >= 5) score += 10
  else if (actCount >= 3) score += 5
  else if (actCount === 0) score -= 5

  // Recency bonus
  if (activities[0]) {
    const daysSince = Math.floor((Date.now() - activities[0].createdAt.getTime()) / 86400000)
    if (daysSince <= 3) score += 5
    else if (daysSince > 14) score -= 5
    else if (daysSince > 30) score -= 10
  }

  // 7. Lead age penalty (older unqualified leads decay)
  const leadAge = Math.floor((Date.now() - lead.createdAt.getTime()) / 86400000)
  if (leadAge > 90) score -= 15
  else if (leadAge > 60) score -= 10
  else if (leadAge > 30) score -= 5

  // 8. Notes quality — longer notes with budget/urgency signals
  if (lead.notes) {
    const lower = lead.notes.toLowerCase()
    if (/\b(budget|бюджет|asap|urgent|срочно|this month|этом месяце)\b/i.test(lower)) score += 10
    if (lead.notes.length > 100) score += 3
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Recalculate scores for all active leads in an organization.
 * Called by cron job.
 */
export async function recalculateOrgLeadScores(orgId: string): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["converted", "lost"] },
    },
    select: {
      id: true,
      email: true,
      contactName: true,
      companyName: true,
      source: true,
      estimatedValue: true,
      notes: true,
      createdAt: true,
    },
  })

  let updated = 0
  for (const lead of leads) {
    const newScore = await calculateLeadScore(orgId, lead)
    await prisma.lead.update({
      where: { id: lead.id },
      data: { score: newScore },
    })
    updated++
  }

  return updated
}
