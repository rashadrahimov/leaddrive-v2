import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { MODULES, API_SCOPES } from "@/lib/permissions"

// GET /api/v1/api-keys/scopes — list every scope an API key can hold.
// Derived from the central MODULES registry so new modules appear automatically.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "core", "read")
  if (isAuthError(auth)) return auth

  return NextResponse.json({
    success: true,
    data: {
      modules: MODULES,
      scopes: API_SCOPES,
    },
  })
}
