import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { validateWhatsAppCredentials } from "@/lib/whatsapp"

// POST /api/v1/whatsapp/validate
// Hits Meta's GET /{phoneNumberId}?fields=verified_name,display_phone_number
// to confirm the stored credentials actually work. Updates
// ChannelConfig.lastValidatedAt on success.
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await validateWhatsAppCredentials(orgId)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
