import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export interface RoleConfig {
  id: string
  name: string
  color: string
  isSystem: boolean
}

const MODULES = [
  "companies", "contacts", "deals", "leads", "tasks", "tickets",
  "contracts", "offers", "campaigns", "reports", "ai", "settings",
]

const DEFAULT_ROLES: RoleConfig[] = [
  { id: "admin",        name: "Admin",        color: "red",    isSystem: true },
  { id: "manager",      name: "Manager",      color: "blue",   isSystem: true },
  { id: "agent",        name: "Agent",        color: "purple", isSystem: true },
  { id: "viewer",       name: "Viewer",       color: "gray",   isSystem: true },
  { id: "sales",        name: "Sales",        color: "emerald", isSystem: false },
  { id: "marketing",    name: "Marketing",    color: "pink",   isSystem: false },
  { id: "finance",      name: "Finance",      color: "amber",  isSystem: false },
  { id: "service_desk", name: "Service Desk", color: "cyan",   isSystem: false },
]

const DEFAULT_PERMISSIONS: Record<string, Record<string, string>> = {
  admin:        { companies: "full", contacts: "full", deals: "full", leads: "full", tasks: "full", tickets: "full", contracts: "full", offers: "full", campaigns: "full", reports: "full", ai: "full", settings: "full" },
  manager:      { companies: "full", contacts: "full", deals: "full", leads: "full", tasks: "full", tickets: "full", contracts: "full", offers: "full", campaigns: "full", reports: "full", ai: "full", settings: "none" },
  agent:        { companies: "edit", contacts: "edit", deals: "edit", leads: "edit", tasks: "full", tickets: "full", contracts: "view", offers: "view", campaigns: "view", reports: "view", ai: "view", settings: "none" },
  viewer:       { companies: "view", contacts: "view", deals: "view", leads: "view", tasks: "view", tickets: "view", contracts: "view", offers: "none", campaigns: "none", reports: "view", ai: "none", settings: "none" },
  sales:        { companies: "full", contacts: "full", deals: "full", leads: "full", tasks: "edit", tickets: "view", contracts: "full", offers: "full", campaigns: "view", reports: "view", ai: "view", settings: "none" },
  marketing:    { companies: "view", contacts: "view", deals: "view", leads: "full", tasks: "edit", tickets: "none", contracts: "none", offers: "view", campaigns: "full", reports: "full", ai: "full", settings: "none" },
  finance:      { companies: "view", contacts: "view", deals: "view", leads: "none", tasks: "view", tickets: "none", contracts: "full", offers: "full", campaigns: "none", reports: "full", ai: "view", settings: "none" },
  service_desk: { companies: "view", contacts: "edit", deals: "none", leads: "none", tasks: "full", tickets: "full", contracts: "none", offers: "none", campaigns: "none", reports: "view", ai: "view", settings: "none" },
}

// GET — list all roles
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })

  const settings = (org?.settings as any) || {}
  const roles: RoleConfig[] = settings.roles || DEFAULT_ROLES
  const savedPerms = settings.permissions || {}

  // Merge: ensure every role has permissions (fill missing from defaults)
  const permissions: Record<string, Record<string, string>> = {}
  for (const role of roles) {
    permissions[role.id] = savedPerms[role.id] || DEFAULT_PERMISSIONS[role.id] || {}
    // Fill missing modules
    for (const mod of MODULES) {
      if (!permissions[role.id][mod]) {
        permissions[role.id][mod] = DEFAULT_PERMISSIONS[role.id]?.[mod] || (mod === "settings" ? "none" : "view")
      }
    }
  }

  return NextResponse.json({ success: true, data: { roles, permissions } })
}

// POST — create a new role
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { name, color } = body

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Role name must be at least 2 characters" }, { status: 400 })
    }

    const id = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
    if (!id) {
      return NextResponse.json({ error: "Invalid role name" }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    })

    const settings = (org?.settings as any) || {}
    const roles: RoleConfig[] = settings.roles || [...DEFAULT_ROLES]
    const permissions = settings.permissions || { ...DEFAULT_PERMISSIONS }

    if (roles.find((r: RoleConfig) => r.id === id)) {
      return NextResponse.json({ error: "Role with this name already exists" }, { status: 400 })
    }

    const newRole: RoleConfig = {
      id,
      name: name.trim(),
      color: color || "slate",
      isSystem: false,
    }

    roles.push(newRole)

    // Default permissions for new role — view only
    const defaultPerms: Record<string, string> = {}
    for (const mod of MODULES) {
      defaultPerms[mod] = mod === "settings" ? "none" : "view"
    }
    permissions[id] = defaultPerms

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: { ...settings, roles, permissions },
      },
    })

    return NextResponse.json({ success: true, data: newRole })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// PUT — update roles and permissions together
export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { roles, permissions } = body

    if (!roles || !permissions) {
      return NextResponse.json({ error: "roles and permissions required" }, { status: 400 })
    }

    // Ensure admin always has full settings
    if (permissions.admin) {
      permissions.admin.settings = "full"
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    })

    const currentSettings = (org?.settings as any) || {}

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: { ...currentSettings, roles, permissions },
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE — delete a custom role
export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const roleId = searchParams.get("id")

    if (!roleId) {
      return NextResponse.json({ error: "Role ID required" }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    })

    const settings = (org?.settings as any) || {}
    const roles: RoleConfig[] = settings.roles || [...DEFAULT_ROLES]
    const permissions = settings.permissions || { ...DEFAULT_PERMISSIONS }

    const role = roles.find((r: RoleConfig) => r.id === roleId)
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }
    if (role.isSystem) {
      return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 })
    }

    // Check if any users have this role
    const usersWithRole = await prisma.user.count({
      where: { organizationId: orgId, role: roleId },
    })
    if (usersWithRole > 0) {
      return NextResponse.json({ error: `Cannot delete role: ${usersWithRole} users still have this role` }, { status: 400 })
    }

    const updatedRoles = roles.filter((r: RoleConfig) => r.id !== roleId)
    delete permissions[roleId]

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: { ...settings, roles: updatedRoles, permissions },
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
