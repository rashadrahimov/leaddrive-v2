export type Role = "admin" | "manager" | "sales" | "support" | "viewer"
export type Action = "read" | "write" | "delete" | "export" | "admin"
export type Module =
  | "companies" | "contacts" | "deals" | "leads" | "tasks"
  | "contracts" | "offers" | "tickets" | "kb" | "campaigns"
  | "reports" | "profitability" | "ai" | "settings" | "users" | "audit"
  // ERP modules
  | "projects" | "budgeting" | "invoices" | "events" | "pricing"
  | "inbox" | "journeys" | "segments" | "voip"

// Permission matrix: role × module × action
const ROLE_PERMISSIONS: Record<Role, Record<string, Action[]>> = {
  admin: {
    "*": ["read", "write", "delete", "export", "admin"],
  },
  manager: {
    companies: ["read", "write", "delete", "export"],
    contacts: ["read", "write", "delete", "export"],
    deals: ["read", "write", "delete", "export"],
    leads: ["read", "write", "delete", "export"],
    tasks: ["read", "write", "delete"],
    contracts: ["read", "write", "export"],
    offers: ["read", "write", "export"],
    invoices: ["read", "write", "export"],
    tickets: ["read", "write"],
    kb: ["read", "write"],
    campaigns: ["read", "write"],
    reports: ["read", "export"],
    profitability: ["read"],
    budgeting: ["read", "write"],
    projects: ["read", "write", "delete"],
    events: ["read", "write"],
    pricing: ["read"],
    inbox: ["read", "write"],
    journeys: ["read", "write"],
    segments: ["read", "write"],
    voip: ["read", "write"],
    ai: ["read"],
    settings: [],
    users: ["read"],
    audit: ["read"],
  },
  sales: {
    companies: ["read", "write"],
    contacts: ["read", "write"],
    deals: ["read", "write", "delete"],
    leads: ["read", "write"],
    tasks: ["read", "write"],
    contracts: ["read"],
    offers: ["read", "write"],
    invoices: ["read"],
    tickets: ["read"],
    kb: ["read"],
    campaigns: ["read"],
    reports: ["read"],
    profitability: [],
    budgeting: [],
    projects: ["read"],
    events: ["read"],
    pricing: [],
    inbox: ["read", "write"],
    journeys: [],
    segments: [],
    voip: ["read", "write"],
    ai: ["read"],
    settings: [],
    users: [],
    audit: [],
  },
  support: {
    companies: ["read"],
    contacts: ["read", "write"],
    deals: ["read"],
    leads: [],
    tasks: ["read", "write"],
    contracts: ["read"],
    offers: [],
    invoices: ["read"],
    tickets: ["read", "write", "delete"],
    kb: ["read", "write"],
    campaigns: [],
    reports: ["read"],
    profitability: [],
    budgeting: [],
    projects: ["read"],
    events: ["read"],
    pricing: [],
    inbox: ["read", "write"],
    journeys: [],
    segments: [],
    voip: ["read", "write"],
    ai: ["read"],
    settings: [],
    users: [],
    audit: [],
  },
  viewer: {
    "*": ["read"],
  },
}

/**
 * Map API route paths to module names for automatic permission resolution.
 */
const ROUTE_MODULE_MAP: Record<string, Module> = {
  "/api/v1/companies": "companies",
  "/api/v1/contacts": "contacts",
  "/api/v1/deals": "deals",
  "/api/v1/leads": "leads",
  "/api/v1/tasks": "tasks",
  "/api/v1/contracts": "contracts",
  "/api/v1/offers": "offers",
  "/api/v1/invoices": "invoices",
  "/api/v1/recurring-invoices": "invoices",
  "/api/v1/tickets": "tickets",
  "/api/v1/kb": "kb",
  "/api/v1/campaigns": "campaigns",
  "/api/v1/reports": "reports",
  "/api/v1/projects": "projects",
  "/api/v1/events": "events",
  "/api/v1/segments": "segments",
  "/api/v1/journeys": "journeys",
  "/api/v1/users": "users",
  "/api/v1/audit-log": "audit",
  "/api/v1/settings": "settings",
  "/api/v1/webhooks": "settings",
  "/api/v1/workflows": "settings",
  "/api/v1/custom-fields": "settings",
  "/api/v1/currencies": "settings",
  "/api/v1/sla-policies": "settings",
  "/api/v1/pipeline-stages": "settings",
  "/api/v1/inbox": "inbox",
  "/api/v1/channels": "inbox",
  "/api/budgeting": "budgeting",
  "/api/v1/cost-model": "profitability",
  "/api/v1/pricing": "pricing",
  "/api/v1/ai": "ai",
  "/api/v1/ai-configs": "ai",
  "/api/v1/ai-sessions": "ai",
  "/api/v1/ai-alerts": "ai",
  "/api/v1/ai-guardrails": "ai",
  "/api/v1/ai-interaction-logs": "ai",
  "/api/v1/calls": "voip",
}

/**
 * Resolve a module from an API route path.
 */
export function resolveModuleFromPath(path: string): Module | null {
  // Try exact match first
  if (ROUTE_MODULE_MAP[path]) return ROUTE_MODULE_MAP[path]

  // Try prefix match (e.g. /api/v1/projects/123/tasks → projects)
  for (const [routePrefix, mod] of Object.entries(ROUTE_MODULE_MAP)) {
    if (path.startsWith(routePrefix + "/") || path === routePrefix) {
      return mod
    }
  }
  return null
}

/**
 * Map HTTP method to permission action.
 */
export function methodToAction(method: string): Action {
  switch (method.toUpperCase()) {
    case "GET": return "read"
    case "POST": return "write"
    case "PUT": case "PATCH": return "write"
    case "DELETE": return "delete"
    default: return "read"
  }
}

export function checkPermission(role: Role, module: Module | string, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  // Wildcard roles (admin, viewer)
  if (perms["*"]?.includes(action)) return true
  // Module-specific
  const modulePerms = perms[module]
  if (!modulePerms) return false
  return modulePerms.includes(action)
}

export function requirePermission(role: Role, module: Module | string, action: Action): void {
  if (!checkPermission(role, module, action)) {
    throw new Error(`Permission denied: role "${role}" cannot "${action}" on "${module}"`)
  }
}

export function canRead(role: Role, module: Module): boolean {
  return checkPermission(role, module, "read")
}

export function canWrite(role: Role, module: Module): boolean {
  return checkPermission(role, module, "write")
}

export function canDelete(role: Role, module: Module): boolean {
  return checkPermission(role, module, "delete")
}

export function canExport(role: Role, module: Module): boolean {
  return checkPermission(role, module, "export")
}

export function isAdmin(role: Role): boolean {
  return role === "admin"
}

export function getUserPermissions(role: Role): Record<string, Action[]> {
  return ROLE_PERMISSIONS[role] || {}
}

/**
 * Get all available modules for permission matrix display.
 */
export const ALL_MODULES: { id: Module; group: string }[] = [
  { id: "companies", group: "CRM" },
  { id: "contacts", group: "CRM" },
  { id: "deals", group: "CRM" },
  { id: "leads", group: "CRM" },
  { id: "tasks", group: "CRM" },
  { id: "contracts", group: "CRM" },
  { id: "offers", group: "CRM" },
  { id: "invoices", group: "CRM" },
  { id: "campaigns", group: "Marketing" },
  { id: "events", group: "Marketing" },
  { id: "journeys", group: "Marketing" },
  { id: "segments", group: "Marketing" },
  { id: "inbox", group: "Communication" },
  { id: "tickets", group: "Support" },
  { id: "kb", group: "Support" },
  { id: "voip", group: "Support" },
  { id: "profitability", group: "Analytics" },
  { id: "budgeting", group: "Analytics" },
  { id: "pricing", group: "Analytics" },
  { id: "reports", group: "Analytics" },
  { id: "ai", group: "Analytics" },
  { id: "projects", group: "ERP" },
  { id: "settings", group: "Settings" },
  { id: "users", group: "Settings" },
  { id: "audit", group: "Settings" },
]

export const ALL_ACTIONS: Action[] = ["read", "write", "delete", "export", "admin"]
export const ALL_ROLES: Role[] = ["admin", "manager", "sales", "support", "viewer"]
