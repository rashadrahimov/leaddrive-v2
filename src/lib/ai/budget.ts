import { prisma } from "@/lib/prisma"

const DEFAULT_DAILY_LIMIT_USD = 5.0

/**
 * Check if organization has remaining AI budget for today.
 * Sums costUsd from AiInteractionLog for the current day.
 * Returns { allowed, spent, limit, remaining }.
 */
export async function checkAiBudget(orgId: string): Promise<{
  allowed: boolean
  spent: number
  limit: number
  remaining: number
}> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const result = await prisma.aiInteractionLog.aggregate({
    where: {
      organizationId: orgId,
      createdAt: { gte: todayStart },
      costUsd: { not: null },
    },
    _sum: { costUsd: true },
  })

  const spent = result._sum.costUsd || 0

  // Get org-level limit from settings, fallback to default
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })
  const settings = (org?.settings as Record<string, any>) || {}
  const limit = typeof settings.aiDailyBudgetUsd === "number"
    ? settings.aiDailyBudgetUsd
    : DEFAULT_DAILY_LIMIT_USD

  const remaining = Math.max(0, limit - spent)

  return {
    allowed: spent < limit,
    spent: Math.round(spent * 1000) / 1000,
    limit,
    remaining: Math.round(remaining * 1000) / 1000,
  }
}

/**
 * Check if a specific AI automation feature is enabled for the organization.
 * Features are stored in Organization.features JSON array.
 */
export async function isAiFeatureEnabled(orgId: string, featureName: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { features: true },
  })

  const features = org?.features
  if (Array.isArray(features)) {
    return features.includes(featureName)
  }

  return false
}

/**
 * Guard function: checks both feature flag AND budget before running an AI automation.
 * Returns { proceed: true } or { proceed: false, reason: string }.
 */
export async function canRunAiAutomation(
  orgId: string,
  featureName: string,
): Promise<{ proceed: boolean; reason?: string }> {
  const enabled = await isAiFeatureEnabled(orgId, featureName)
  if (!enabled) {
    return { proceed: false, reason: `Feature "${featureName}" is not enabled` }
  }

  const budget = await checkAiBudget(orgId)
  if (!budget.allowed) {
    return { proceed: false, reason: `Daily AI budget exceeded: $${budget.spent}/$${budget.limit}` }
  }

  return { proceed: true }
}
