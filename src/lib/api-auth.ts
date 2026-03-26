import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"
import { checkPermission, resolveModuleFromPath, methodToAction, type Role, type Module, type Action } from "./permissions"

interface AuthResult {
  orgId: string
  userId: string
  role: Role
  email: string
  name: string
}

/**
 * Get authenticated session with organization context.
 * Returns null if unauthenticated.
 */
export async function getSession(req: NextRequest): Promise<AuthResult | null> {
  // Try header first (faster, no DB call)
  const fromHeader = req.headers.get("x-organization-id")

  try {
    const session = await auth()
    if (!session?.user) return null

    return {
      orgId: fromHeader || session.user.organizationId || "",
      userId: session.user.id || "",
      role: (session.user.role || "viewer") as Role,
      email: session.user.email || "",
      name: session.user.name || "",
    }
  } catch {
    return null
  }
}

/**
 * Get organizationId from request header or session.
 * Backward-compatible wrapper — delegates to getSession().
 */
export async function getOrgId(req: NextRequest): Promise<string | null> {
  // Try header first (faster)
  const fromHeader = req.headers.get("x-organization-id")
  if (fromHeader) return fromHeader

  const session = await getSession(req)
  return session?.orgId || null
}

/**
 * Require authentication + permission check.
 *
 * Usage in API routes:
 *   const auth = await requireAuth(req, "projects", "write")
 *   if (auth instanceof NextResponse) return auth  // 401 or 403
 *   // auth is AuthResult — proceed
 *
 * Or auto-resolve from URL:
 *   const auth = await requireAuth(req)
 *   if (auth instanceof NextResponse) return auth
 */
export async function requireAuth(
  req: NextRequest,
  module?: Module | string,
  action?: Action
): Promise<AuthResult | NextResponse> {
  const session = await getSession(req)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Resolve module and action from request if not explicitly provided
  const resolvedModule = module || resolveModuleFromPath(new URL(req.url).pathname)
  const resolvedAction = action || methodToAction(req.method)

  // Check permission if we could resolve a module
  if (resolvedModule) {
    const allowed = checkPermission(session.role, resolvedModule, resolvedAction)
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: `Role "${session.role}" cannot "${resolvedAction}" on "${resolvedModule}"`,
        },
        { status: 403 }
      )
    }
  }

  return session
}

/**
 * Helper to check if requireAuth returned an error response.
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
