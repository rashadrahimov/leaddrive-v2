/**
 * Plan-based feature gating for CRM modules.
 *
 * Each plan tier includes all modules from the previous tier plus its own.
 * Paths listed here correspond to dashboard routes (e.g. "/tickets", "/settings/workflows").
 *
 * Plans: starter < business < professional < enterprise
 */

const STARTER_MODULES = [
  "/companies",
  "/contacts",
  "/deals",
  "/tasks",
  "/leads",
  "/products",
] as const

const BUSINESS_MODULES = [
  ...STARTER_MODULES,
  "/tickets",
  "/knowledge-base",
  "/contracts",
  "/support/agent-desktop",
  "/support/calendar",
  "/settings/roles",
  "/settings/sla-policies",
] as const

const PROFESSIONAL_MODULES = [
  ...BUSINESS_MODULES,
  "/invoices",
  "/campaigns",
  "/segments",
  "/email-templates",
  "/email-log",
  "/campaign-roi",
  "/ai-scoring",
  "/journeys",
  "/events",
  "/reports",
  "/settings/workflows",
  "/settings/lead-rules",
  "/settings/web-to-lead",
] as const

const ENTERPRISE_MODULES = [
  ...PROFESSIONAL_MODULES,
  "/pricing",
  "/profitability",
  "/inbox",
  "/settings/portal-users",
  "/settings/smtp-settings",
  "/settings/custom-fields",
  "/settings/dashboard",
  "/settings/invoice-settings",
] as const

export const PLAN_MODULES: Record<string, readonly string[]> = {
  starter: STARTER_MODULES,
  business: BUSINESS_MODULES,
  professional: PROFESSIONAL_MODULES,
  enterprise: ENTERPRISE_MODULES,
}

/** Ordered list of plan tiers (lowest to highest). */
export const PLAN_TIERS = ["starter", "business", "professional", "enterprise"] as const
export type PlanTier = (typeof PLAN_TIERS)[number]

/**
 * Paths that are always accessible regardless of plan.
 * Dashboard root, core settings pages, billing, security, users, audit-log, notifications, ai-command-center.
 */
const ALWAYS_ACCESSIBLE = [
  "/",
  "/settings",
  "/settings/billing",
  "/settings/security",
  "/settings/users",
  "/settings/audit-log",
  "/notifications",
  "/ai-command-center",
] as const

/**
 * Check if a given path is allowed for the specified plan.
 *
 * Rules:
 * 1. Paths in ALWAYS_ACCESSIBLE are allowed for every plan.
 * 2. API routes (/api/...) are not gated here (handled separately).
 * 3. Static/system paths (_next, favicon, etc.) pass through.
 * 4. For dashboard paths, we check if the path (or its prefix) is in the plan's module list.
 */
export function canAccessModule(plan: string, path: string): boolean {
  // Always-accessible paths (exact match)
  if (ALWAYS_ACCESSIBLE.includes(path as any)) return true

  // API routes are not gated by this function
  if (path.startsWith("/api/")) return true

  // Public / auth paths
  if (path.startsWith("/login") || path.startsWith("/register") || path.startsWith("/forgot-password") || path.startsWith("/portal")) {
    return true
  }

  const planModules = PLAN_MODULES[plan]
  if (!planModules) {
    // Unknown plan — deny by default
    return false
  }

  // Check if path matches any allowed module path.
  // A path matches if it equals or starts with a module path.
  // e.g. "/tickets/123" matches "/tickets", "/settings/workflows/new" matches "/settings/workflows"
  for (const modulePath of planModules) {
    if (path === modulePath || path.startsWith(modulePath + "/")) {
      return true
    }
  }

  return false
}

/**
 * Return the minimum plan required to access the given path.
 * Returns null if the path is always accessible.
 */
export function getRequiredPlan(path: string): PlanTier | null {
  if (ALWAYS_ACCESSIBLE.includes(path as any)) return null

  for (const tier of PLAN_TIERS) {
    const modules = PLAN_MODULES[tier]
    for (const modulePath of modules) {
      if (path === modulePath || path.startsWith(modulePath + "/")) {
        return tier
      }
    }
  }

  // Path not found in any plan — might be always-accessible or unknown
  return null
}

/**
 * Check if a sidebar nav href is accessible for the given plan.
 * Used by sidebar to decide whether to show or hide items.
 */
export function isSidebarItemAccessible(plan: string, href: string): boolean {
  return canAccessModule(plan, href)
}
