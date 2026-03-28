import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"
import { prisma } from "./prisma"
import { checkPermission, resolveModuleFromPath, methodToAction, type Role, type Module, type Action } from "./permissions"

// In-memory cache for passwordChangedAt checks (avoids DB query on every request)
const pwCheckCache = new Map<string, { checkedAt: number; changedAt: number | null }>()
const PW_CHECK_INTERVAL = 60_000 // 60 seconds

interface AuthResult {
  orgId: string
  userId: string
  role: Role
  email: string
  name: string
}

/**
 * Get authenticated session with organization context.
 * SECURITY: Always uses organizationId from the authenticated session JWT,
 * never trusts the x-organization-id header directly (prevents tenant bypass).
 */
export async function getSession(req: NextRequest): Promise<AuthResult | null> {
  try {
    const session = await auth()
    if (!session?.user) return null

    return {
      orgId: session.user.organizationId || "",
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
 * Get organizationId from authenticated session.
 * SECURITY: Uses session JWT only — ignores x-organization-id header
 * to prevent cross-tenant data access via header injection.
 */
export async function getOrgId(req: NextRequest): Promise<string | null> {
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
  const rawSession = await auth()
  if (!rawSession?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // SECURITY: Block API access if 2FA verification is pending
  const needs2fa = (rawSession.user as any).needs2fa
  const needsSetup2fa = (rawSession.user as any).needsSetup2fa
  if (needs2fa || needsSetup2fa) {
    return NextResponse.json({ error: "2FA verification required" }, { status: 403 })
  }

  const session: AuthResult = {
    orgId: rawSession.user.organizationId || "",
    userId: rawSession.user.id || "",
    role: (rawSession.user.role || "viewer") as Role,
    email: rawSession.user.email || "",
    name: rawSession.user.name || "",
  }

  // SECURITY: Check if password was changed after JWT was issued (runs on Node.js, not Edge)
  const tokenIat = (rawSession as any)?.token?.iat || (rawSession as any)?.iat
  if (session.userId && tokenIat) {
    try {
      const now = Date.now()
      const cached = pwCheckCache.get(session.userId)
      let changedAt = cached?.changedAt ?? null

      if (!cached || now - cached.checkedAt > PW_CHECK_INTERVAL) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { passwordChangedAt: true },
        })
        changedAt = dbUser?.passwordChangedAt?.getTime() ?? null
        pwCheckCache.set(session.userId, { checkedAt: now, changedAt })
      }

      if (changedAt && changedAt > tokenIat * 1000) {
        return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 })
      }
    } catch {
      // Non-critical — don't block request on cache/DB failure
    }
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
