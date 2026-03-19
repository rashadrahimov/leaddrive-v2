import { PLANS, type PlanId } from "@/lib/modules"

export type Resource = "users" | "contacts" | "ai_calls"

interface OrgContext {
  plan: string
  currentUsage?: Record<Resource, number>
}

function getLimit(plan: string, resource: Resource): number {
  const planLimits = PLANS[plan as PlanId]?.limits
  if (!planLimits) return 0

  if (resource === "users") return planLimits.users
  if (resource === "contacts") return planLimits.contacts
  if (resource === "ai_calls") return 1000 // Default AI call limit

  return 0
}

export function checkLimit(
  org: OrgContext,
  resource: Resource,
  current: number = 0
): boolean {
  const limit = getLimit(org.plan, resource)
  if (limit === -1) return true // Unlimited

  const usage = org.currentUsage?.[resource] ?? current
  return usage < limit
}

export function getRemainingLimit(
  org: OrgContext,
  resource: Resource,
  current: number = 0
): number {
  const limit = getLimit(org.plan, resource)
  if (limit === -1) return Infinity

  const usage = org.currentUsage?.[resource] ?? current
  return Math.max(0, limit - usage)
}

export function getPercentageUsed(
  org: OrgContext,
  resource: Resource,
  current: number = 0
): number {
  const limit = getLimit(org.plan, resource)
  if (limit === -1 || limit === 0) return 0

  const usage = org.currentUsage?.[resource] ?? current
  return Math.min(100, (usage / limit) * 100)
}
