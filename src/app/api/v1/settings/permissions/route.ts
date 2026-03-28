import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"

const MODULES = [
  "companies", "contacts", "deals", "leads", "tasks", "tickets",
  "contracts", "offers", "campaigns", "reports", "ai", "settings",
]
const ROLES = ["admin", "manager", "agent", "viewer"] as const
const ACCESS_LEVELS = ["full", "edit", "view", "none"] as const

const DEFAULT_PERMISSIONS: Record<string, Record<string, string>> = {
  admin:   { companies: "full", contacts: "full", deals: "full", leads: "full", tasks: "full", tickets: "full", contracts: "full", offers: "full", campaigns: "full", reports: "full", ai: "full", settings: "full" },
  manager: { companies: "full", contacts: "full", deals: "full", leads: "full", tasks: "full", tickets: "full", contracts: "full", offers: "full", campaigns: "full", reports: "full", ai: "full", settings: "none" },
  agent:   { companies: "edit", contacts: "edit", deals: "edit", leads: "edit", tasks: "full", tickets: "full", contracts: "view", offers: "view", campaigns: "view", reports: "view", ai: "view", settings: "none" },
  viewer:  { companies: "view", contacts: "view", deals: "view", leads: "view", tasks: "view", tickets: "view", contracts: "view", offers: "none", campaigns: "none", reports: "view", ai: "none", settings: "none" },
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })

  const settings = (org?.settings as any) || {}
  const permissions = settings.permissions || DEFAULT_PERMISSIONS

  return NextResponse.json({ success: true, data: permissions })
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAuth(req, "settings", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId

  try {
    const body = await req.json()

    // Validate structure
    for (const role of ROLES) {
      if (!body[role] || typeof body[role] !== "object") {
        return NextResponse.json({ error: `Missing permissions for role: ${role}` }, { status: 400 })
      }
      for (const mod of MODULES) {
        const level = body[role][mod]
        if (!ACCESS_LEVELS.includes(level)) {
          return NextResponse.json({ error: `Invalid access level "${level}" for ${role}.${mod}` }, { status: 400 })
        }
      }
    }

    // Admin must always have full settings access
    body.admin.settings = "full"

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    })

    const currentSettings = (org?.settings as any) || {}

    await prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...currentSettings,
          permissions: body,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
