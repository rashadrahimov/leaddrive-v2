export type ModuleId =
  | "core" | "deals" | "leads" | "tasks" | "contracts" | "invoices"
  | "tickets" | "knowledge-base" | "portal" | "campaigns" | "omnichannel"
  | "journeys" | "workflows" | "profitability" | "budgeting" | "ai" | "reports"
  | "currencies" | "custom-fields" | "events" | "projects" | "mtm"

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
}

export const PLANS = {
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

export type PlanId = keyof typeof PLANS

interface OrgModuleContext {
  plan: string
  addons?: string[]
  modules?: Record<string, boolean>
}

export function hasModule(org: OrgModuleContext, moduleId: ModuleId): boolean {
  if (MODULE_REGISTRY[moduleId]?.alwaysOn) return true
  const planModules = PLANS[org.plan as PlanId]?.modules || []
  if (planModules.includes(moduleId)) return true
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
