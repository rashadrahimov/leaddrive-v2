import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret"

export interface MobileAuthResult {
  agentId: string
  userId: string
  orgId: string
  email: string
  name: string
  role: string
}

/**
 * Verify mobile JWT token from Authorization header.
 * Returns agent info or null.
 */
export function getMobileAuth(req: NextRequest): MobileAuthResult | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  // Skip API keys (ld_ prefix)
  if (token.startsWith("ld_")) return null

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    if (!payload.agentId) return null

    return {
      agentId: payload.agentId,
      userId: payload.userId,
      orgId: payload.orgId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    }
  } catch {
    return null
  }
}

/**
 * Require mobile auth — returns MobileAuthResult or 401 response.
 */
export function requireMobileAuth(req: NextRequest): MobileAuthResult | NextResponse {
  const auth = getMobileAuth(req)
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return auth
}
