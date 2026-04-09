export type ModuleId =
  | "core" | "deals" | "leads" | "tasks" | "contracts" | "invoices"
  | "tickets" | "knowledge-base" | "portal" | "campaigns" | "omnichannel"
  | "journeys" | "workflows" | "profitability" | "budgeting" | "ai" | "reports"
  | "currencies" | "custom-fields" | "events" | "projects" | "mtm" | "voip"

interface ModuleDefinition {
  name: string
  requires: ModuleId[]
  alwaysOn?: boolean
}

export const MODULE_REGISTRY: Record<ModuleId, ModuleDefinition> = {
  core:             { name: "Core CRM",        requires: [],            alwaysOn: true },
  deals:            { name: "Deals",            requires: ["core"] },
  leads:            { name: "Leads",            requires: ["core"] },
  tasks:            { name: "Tasks",            requires: ["core"] },
  contracts:        { name: "Contracts",        requires: ["core"] },
  invoices:         { name: "Invoices",         requires: ["deals"] },
  tickets:          { name: "Tickets & SLA",    requires: ["core"] },
  "knowledge-base": { name: "Knowledge Base",   requires: ["core"] },
  portal:           { name: "Client Portal",    requires: ["tickets"] },
  campaigns:        { name: "Campaigns",        requires: ["core"] },
  omnichannel:      { name: "Omni-Channel",     requires: ["core"] },
  journeys:         { name: "Journey Builder",  requires: ["campaigns"] },
  workflows:        { name: "Workflows",        requires: ["core"] },
  profitability:    { name: "Profitability",    requires: ["core"] },
  budgeting:        { name: "Budgeting",        requires: ["core"] },
  ai:               { name: "Da Vinci Suite",         requires: ["core"] },
  reports:          { name: "Reports",          requires: ["core"] },
  currencies:       { name: "Multi-Currency",   requires: ["core"] },
  "custom-fields":  { name: "Custom Fields",    requires: ["core"] },
  events:           { name: "Events",           requires: ["core"] },
  projects:         { name: "Projects",         requires: ["tasks"] },
  mtm:              { name: "Field Teams (MTM)", requires: ["core"] },
  voip:             { name: "VoIP / Telephony", requires: ["core"] },
}

/** Legacy plan definitions — kept for backward compatibility with existing orgs */
export const LEGACY_PLANS = {
  starter: {
    modules: ["core", "deals", "leads", "tasks"] as ModuleId[],
    limits: { users: 3, contacts: 500 },
    price: 9,
  },
  business: {
    modules: [
      "core", "deals", "leads", "tasks", "contracts", "tickets",
      "knowledge-base",
    ] as ModuleId[],
    limits: { users: 10, contacts: 2500 },
    price: 19,
  },
  professional: {
    modules: [
      "core", "deals", "leads", "tasks", "contracts", "invoices", "tickets",
      "knowledge-base", "campaigns", "omnichannel", "reports",
      "workflows", "currencies", "events", "projects",
      "budgeting", "profitability",
    ] as ModuleId[],
    limits: { users: 25, contacts: 10000 },
    price: 29,
  },
  enterprise: {
    modules: [...Object.keys(MODULE_REGISTRY)] as ModuleId[],
    limits: { users: -1, contacts: -1 },
    price: 59,
  },
} as const

/** @deprecated Use USER_TIERS instead */
export const PLANS = LEGACY_PLANS

export type PlanId = keyof typeof LEGACY_PLANS

/* ─── New user-tier pricing model ─── */

export const USER_TIERS = {
  "tier-5":     { maxUsers: 5,  price: 550,  pricePerUser: 110, discount: 0 },
  "tier-10":    { maxUsers: 10, price: 990,  pricePerUser: 99,  discount: 10 },
  "tier-25":    { maxUsers: 25, price: 2200, pricePerUser: 88,  discount: 20 },
  "tier-50":    { maxUsers: 50, price: 3850, pricePerUser: 77,  discount: 30 },
  "enterprise": { maxUsers: -1, price: -1,   pricePerUser: -1,  discount: -1 },
} as const

export type UserTierId = keyof typeof USER_TIERS

export const TIER_ORDER: UserTierId[] = ["tier-5", "tier-10", "tier-25", "tier-50", "enterprise"]

/** Modules included in every base plan (CRM + Marketing + Support + Analytics) */
export const BASE_PLAN_MODULES: ModuleId[] = [
  "core", "deals", "leads", "tasks", "contracts",
  "campaigns", "events", "reports", "workflows",
  "knowledge-base", "tickets", "custom-fields", "currencies",
  "projects",
]

/** Add-on and subscription module mappings */
export const ADDON_MODULES: Record<string, ModuleId[]> = {
  ai:       ["ai"],
  channels: ["omnichannel"],
  finance:  ["invoices", "budgeting", "profitability"],
  mtm:      ["mtm"],
}

export const PAID_ADDONS = {
  ai:       { id: "ai",       name: "Da Vinci AI", moduleIds: ["ai"] as ModuleId[] },
  channels: { id: "channels", name: "Channels",    moduleIds: ["omnichannel"] as ModuleId[] },
} as const

export const SEPARATE_SUBSCRIPTIONS = {
  finance: { id: "finance", name: "Finance Suite",     moduleIds: ["invoices", "budgeting", "profitability"] as ModuleId[] },
  mtm:     { id: "mtm",    name: "Field Teams (MTM)", moduleIds: ["mtm"] as ModuleId[] },
} as const

const NEW_TIER_PLANS = new Set(Object.keys(USER_TIERS))
const LEGACY_PLAN_NAMES = new Set(Object.keys(LEGACY_PLANS))

function isNewTier(plan: string): boolean {
  return NEW_TIER_PLANS.has(plan)
}

interface OrgModuleContext {
  plan: string
  addons?: string[]
  modules?: Record<string, boolean>
}

export function hasModule(org: OrgModuleContext, moduleId: ModuleId): boolean {
  if (MODULE_REGISTRY[moduleId]?.alwaysOn) return true

  // New tier-based plans: base modules + addon-unlocked modules
  if (isNewTier(org.plan)) {
    if (BASE_PLAN_MODULES.includes(moduleId)) return true
    // Check if any of the org's addons unlock this module
    if (org.addons) {
      for (const addon of org.addons) {
        if (ADDON_MODULES[addon]?.includes(moduleId)) return true
      }
    }
    if (org.modules?.[moduleId]) return true
    return false
  }

  // Legacy plan fallback
  if (LEGACY_PLAN_NAMES.has(org.plan)) {
    const planModules = LEGACY_PLANS[org.plan as PlanId]?.modules || []
    if (planModules.includes(moduleId)) return true
  }

  if (org.addons?.includes(moduleId)) return true
  if (org.modules?.[moduleId]) return true
  return false
}

export function requireModule(moduleId: ModuleId) {
  return (org: OrgModuleContext) => {
    if (!hasModule(org, moduleId)) {
      throw new Error(
        `Module "${MODULE_REGISTRY[moduleId].name}" is not enabled. Upgrade your plan or add it as an add-on.`
      )
    }
  }
}

export function getOrgModules(org: OrgModuleContext): ModuleId[] {
  return (Object.keys(MODULE_REGISTRY) as ModuleId[]).filter((m) =>
    hasModule(org, m)
  )
}
