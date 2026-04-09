/**
 * Plan-based feature gating for CRM modules.
 *
 * New model: all user-tier plans (tier-5, tier-10, etc.) get identical BASE_ROUTES.
 * Additional routes are unlocked via addons (ai, channels, finance, mtm).
 *
 * Legacy plans (starter/business/professional/enterprise) get full BASE access
 * to avoid locking out existing orgs.
 */

import { USER_TIERS } from "./modules"

const NEW_TIER_PLANS = new Set(Object.keys(USER_TIERS))
const LEGACY_PLANS = new Set(["starter", "business", "professional", "enterprise"])

/** Routes available in every base plan (CRM + Marketing + Support + Analytics) */
const BASE_ROUTES = [
  // CRM
  "/companies", "/contacts", "/deals", "/leads", "/tasks",
  "/contracts", "/products", "/offers",
  // Marketing
  "/campaigns", "/segments", "/email-templates", "/email-log",
  "/campaign-roi", "/ai-scoring", "/journeys", "/events",
  "/pages",
  // Support
  "/tickets", "/knowledge-base",
  "/support/agent-desktop", "/support/calendar",
  // Analytics
  "/reports", "/reports/builder",
  "/forecast",
  // Projects
  "/projects",
  // Settings
  "/settings/pipelines", "/settings/roles", "/settings/sla-policies",
  "/settings/workflows", "/settings/lead-rules", "/settings/web-to-lead",
  "/settings/custom-fields", "/settings/portal-users", "/settings/smtp-settings",
  "/settings/custom-domains", "/settings/field-permissions",
  "/settings/dashboard", "/settings/sales-forecast",
] as const

/** Routes gated behind paid add-ons / separate subscriptions */
const ADDON_ROUTES: Record<string, readonly string[]> = {
  ai: ["/ai-command-center"],
  channels: ["/inbox", "/settings/channels"],
  finance: [
    "/invoices", "/finance", "/budgeting", "/profitability", "/pricing",
    "/settings/invoice-settings", "/settings/finance-notifications",
    "/settings/budget-config",
  ],
  mtm: [
    "/mtm", "/mtm/map", "/mtm/routes", "/mtm/visits", "/mtm/tasks",
    "/mtm/customers", "/mtm/photos", "/mtm/alerts", "/mtm/orders",
    "/mtm/agents", "/mtm/settings",
  ],
  // VoIP is also addon-gated
  voip: ["/support/voip", "/settings/voip"],
}

/** Ordered list of plan tiers (lowest to highest). */
export const PLAN_TIERS = ["tier-5", "tier-10", "tier-25", "tier-50", "enterprise"] as const
export type PlanTier = (typeof PLAN_TIERS)[number]

/**
 * Paths that are always accessible regardless of plan.
 */
const ALWAYS_ACCESSIBLE = [
  "/",
  "/dashboard",
  "/settings",
  "/settings/billing",
  "/settings/security",
  "/settings/users",
  "/settings/audit-log",
  "/settings/integrations",
  "/settings/macros",
  "/settings/organization",
  "/notifications",
] as const

/* ─── Legacy module lists (kept for getRequiredPlan backward compat) ─── */
const STARTER_MODULES = [
  "/companies", "/contacts", "/deals", "/tasks", "/leads", "/products", "/offers",
  "/settings/pipelines",
] as const

const BUSINESS_MODULES = [
  ...STARTER_MODULES,
  "/tickets", "/knowledge-base", "/contracts",
  "/support/agent-desktop", "/support/calendar",
  "/settings/roles", "/settings/sla-policies",
] as const

const PROFESSIONAL_MODULES = [
  ...BUSINESS_MODULES,
  "/invoices", "/finance", "/budgeting", "/profitability", "/pricing",
  "/campaigns", "/segments", "/email-templates", "/email-log",
  "/campaign-roi", "/ai-scoring", "/journeys", "/events",
  "/reports", "/settings/workflows", "/settings/lead-rules", "/settings/web-to-lead",
  "/projects",
] as const

const ENTERPRISE_MODULES = [
  ...PROFESSIONAL_MODULES,
  "/inbox", "/settings/portal-users", "/settings/smtp-settings",
  "/settings/custom-fields", "/settings/dashboard",
  "/settings/invoice-settings", "/settings/finance-notifications",
  "/settings/channels", "/settings/budget-config", "/settings/sales-forecast",
  "/settings/field-permissions", "/settings/voip", "/support/voip",
  "/settings/custom-domains", "/pages", "/reports/builder",
  "/mtm", "/mtm/map", "/mtm/routes", "/mtm/visits", "/mtm/tasks",
  "/mtm/customers", "/mtm/photos", "/mtm/alerts", "/mtm/orders",
  "/mtm/agents", "/mtm/settings",
  "/ai-command-center",
] as const

export const PLAN_MODULES: Record<string, readonly string[]> = {
  starter: STARTER_MODULES,
  business: BUSINESS_MODULES,
  professional: PROFESSIONAL_MODULES,
  enterprise: ENTERPRISE_MODULES,
}

function pathMatchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(route + "/")
}

function pathMatchesRoutes(path: string, routes: readonly string[]): boolean {
  return routes.some((r) => pathMatchesRoute(path, r))
}

/**
 * Check if a given path is allowed for the specified plan and addons.
 */
export function canAccessModule(plan: string, path: string, addons: string[] = []): boolean {
  // Always-accessible paths
  if (ALWAYS_ACCESSIBLE.includes(path as any)) return true

  // API routes are not gated by this function
  if (path.startsWith("/api/")) return true

  // Public / auth paths
  if (path.startsWith("/login") || path.startsWith("/register") ||
      path.startsWith("/forgot-password") || path.startsWith("/portal")) {
    return true
  }

  // New tier-based plans or legacy plans: check base routes
  if (NEW_TIER_PLANS.has(plan) || LEGACY_PLANS.has(plan)) {
    if (pathMatchesRoutes(path, BASE_ROUTES)) return true
  }

  // Check addon-gated routes
  for (const addon of addons) {
    const routes = ADDON_ROUTES[addon]
    if (routes && pathMatchesRoutes(path, routes)) return true
  }

  // Legacy plans: also check their cumulative module lists for backward compat
  if (LEGACY_PLANS.has(plan)) {
    const legacyModules = PLAN_MODULES[plan]
    if (legacyModules && pathMatchesRoutes(path, legacyModules)) return true
  }

  return false
}

/**
 * Return the minimum plan required to access the given path.
 * Returns null if the path is always accessible.
 */
export function getRequiredPlan(path: string): string | null {
  if (ALWAYS_ACCESSIBLE.includes(path as any)) return null

  // Check if it's a base route (available in any plan)
  if (pathMatchesRoutes(path, BASE_ROUTES)) return "tier-5"

  // Check addon routes
  for (const [addon, routes] of Object.entries(ADDON_ROUTES)) {
    if (pathMatchesRoutes(path, routes)) return `addon:${addon}`
  }

  return null
}

/**
 * Check if a sidebar nav href is accessible for the given plan.
 */
export function isSidebarItemAccessible(plan: string, href: string, addons: string[] = []): boolean {
  return canAccessModule(plan, href, addons)
}
