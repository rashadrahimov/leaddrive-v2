import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"

/**
 * Returns the VAPID public key so the browser can call pushManager.subscribe.
 * Endpoint is authenticated — only CRM agents need it.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth

  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ success: false, error: "VAPID not configured" }, { status: 503 })
  }
  return NextResponse.json({ success: true, data: { publicKey: key } })
}
