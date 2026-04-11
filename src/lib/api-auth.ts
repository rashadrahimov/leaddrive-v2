import { NextRequest, NextResponse } from "next/server"
import { auth } from "./auth"
import { prisma } from "./prisma"
import { checkPermission, resolveModuleFromPath, methodToAction, type Role, type Module, type Action } from "./permissions"
import { getMobileAuth } from "./mobile-auth"
import crypto from "crypto"

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
 * Authenticate via API key (Authorization: Bearer ld_...).
 * Returns AuthResult if valid, null otherwise.
 * Updates lastUsedAt on successful auth.
 */
async function getApiKeyAuth(req: NextRequest): Promise<(AuthResult & { scopes: string[] }) | null> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ld_")) return null

  const rawKey = authHeader.slice(7) // Remove "Bearer "
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")

  try {
    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash, isActive: true },
      include: { organization: true },
    })
    if (!apiKey) return null
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

    // Update lastUsedAt (non-blocking)
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

    return {
      orgId: apiKey.organizationId,
      userId: apiKey.createdBy,
      role: "admin" as Role,
      email: "",
      name: `API Key: ${apiKey.name}`,
      scopes: apiKey.scopes,
    }
  } catch {
    return null
  }
}

/**
 * Get organizationId from authenticated session or API key.
 * For API key: also validates scopes against the request method and path.
 */
export async function getOrgId(req: NextRequest): Promise<string | null> {
  const session = await getSession(req)
  if (session?.orgId) return session.orgId

  // Try mobile JWT auth (field agent app)
  const mobileAuth = getMobileAuth(req)
  if (mobileAuth?.orgId) return mobileAuth.orgId

  const apiKeyAuth = await getApiKeyAuth(req)
  if (!apiKeyAuth) return null

  // Enforce scope check for API key requests
  const resolvedModule = resolveModuleFromPath(new URL(req.url).pathname)
  const resolvedAction = methodToAction(req.method)
  if (resolvedModule) {
    const requiredScope = `${resolvedAction === "read" ? "read" : "write"}:${resolvedModule}`
    if (!apiKeyAuth.scopes.includes(requiredScope) && !apiKeyAuth.scopes.includes(`write:${resolvedModule}`)) {
      return null // Deny — missing scope
    }
  }

  return apiKeyAuth.orgId
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
  // Try session auth first, then API key
  const rawSession = await auth()
  if (!rawSession?.user) {
    // Fallback to mobile JWT auth (field agent app)
    const mobileAuth = getMobileAuth(req)
    if (mobileAuth) {
      return {
        orgId: mobileAuth.orgId,
        userId: mobileAuth.userId || mobileAuth.agentId,
        role: (mobileAuth.role || "agent") as Role,
        email: mobileAuth.email,
        name: mobileAuth.name,
      }
    }

    // Fallback to API key auth
    const apiKeyAuth = await getApiKeyAuth(req)
    if (apiKeyAuth) {
      // Check scope permission for API key
      const resolvedModule = module || resolveModuleFromPath(new URL(req.url).pathname)
      const resolvedAction = action || methodToAction(req.method)
      if (resolvedModule) {
        const requiredScope = `${resolvedAction === "read" ? "read" : "write"}:${resolvedModule}`
        if (!apiKeyAuth.scopes.includes(requiredScope) && !apiKeyAuth.scopes.includes(`write:${resolvedModule}`)) {
          return NextResponse.json({ error: "Forbidden", message: `API key missing scope: ${requiredScope}` }, { status: 403 })
        }
      }
      return apiKeyAuth
    }
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
