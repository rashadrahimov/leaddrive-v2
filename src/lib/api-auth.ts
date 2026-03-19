import { NextRequest } from "next/server"
import { auth } from "./auth"

/**
 * Get organizationId from request header or session.
 * API routes can receive orgId via x-organization-id header (from frontend)
 * or fall back to the JWT session.
 */
export async function getOrgId(req: NextRequest): Promise<string | null> {
  // Try header first (faster, no DB call)
  const fromHeader = req.headers.get("x-organization-id")
  if (fromHeader) return fromHeader

  // Fall back to session
  try {
    const session = await auth()
    return session?.user?.organizationId || null
  } catch {
    return null
  }
}
