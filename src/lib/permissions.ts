export type Role = "admin" | "manager" | "sales" | "support" | "viewer"
export type Action = "read" | "write" | "delete" | "export" | "admin"
export type Module = "companies" | "contacts" | "deals" | "leads" | "tasks" |
  "contracts" | "offers" | "tickets" | "kb" | "campaigns" | "reports" |
  "profitability" | "ai" | "settings" | "users" | "audit"

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
    tickets: ["read", "write"],
    kb: ["read", "write"],
    campaigns: ["read", "write"],
    reports: ["read", "export"],
    profitability: ["read"],
    ai: ["read"],
    settings: [],
    users: ["read"],
    audit: ["read"],
  },
  sales: {
    companies: ["read", "write"],
    contacts: ["read", "write"],
    deals: ["read", "write"],
    leads: ["read", "write"],
    tasks: ["read", "write"],
    contracts: ["read"],
    offers: ["read", "write"],
    tickets: ["read"],
    kb: ["read"],
    campaigns: ["read"],
    reports: ["read"],
    profitability: [],
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
    tickets: ["read", "write", "delete"],
    kb: ["read", "write"],
    campaigns: [],
    reports: ["read"],
    profitability: [],
    ai: ["read"],
    settings: [],
    users: [],
    audit: [],
  },
  viewer: {
    "*": ["read"],
  },
}

export function checkPermission(role: Role, module: Module | string, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  // Admin has wildcard
  if (perms["*"]?.includes(action)) return true
  // Viewer has wildcard read
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
