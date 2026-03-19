export type Role = "admin" | "manager" | "viewer"
export type Action = "read" | "write" | "delete" | "export" | "admin"

const ROLE_PERMISSIONS: Record<Role, Action[]> = {
  admin: ["read", "write", "delete", "export", "admin"],
  manager: ["read", "write"],
  viewer: ["read"],
}

export function checkPermission(
  role: Role,
  _module: string,
  action: Action
): boolean {
  if (!ROLE_PERMISSIONS[role]) return false
  return ROLE_PERMISSIONS[role].includes(action)
}

export function requirePermission(role: Role, action: Action): void {
  if (!checkPermission(role, "", action)) {
    throw new Error(`Permission denied: "${action}" not allowed for role "${role}"`)
  }
}

export function canRead(role: Role): boolean {
  return checkPermission(role, "", "read")
}

export function canWrite(role: Role): boolean {
  return checkPermission(role, "", "write")
}

export function canDelete(role: Role): boolean {
  return checkPermission(role, "", "delete")
}

export function canExport(role: Role): boolean {
  return checkPermission(role, "", "export")
}

export function isAdmin(role: Role): boolean {
  return checkPermission(role, "", "admin")
}
