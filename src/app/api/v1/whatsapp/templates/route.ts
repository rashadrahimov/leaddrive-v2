import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { listApprovedTemplates, syncTemplatesFromMeta } from "@/lib/whatsapp"
import { prisma } from "@/lib/prisma"

// GET /api/v1/whatsapp/templates
// Query: status=APPROVED|PENDING|REJECTED|all (default "all" for admin UI,
//        "APPROVED" when called from Lead detail picker)
//        language=en|ru|az (optional)
//        category=MARKETING|UTILITY|AUTHENTICATION (optional)
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || "all"
  const language = searchParams.get("language") || undefined
  const category = searchParams.get("category") || undefined

  // Summary of the channel config for the admin UI — stale sync/validate
  // timestamps are useful to spot tenants that haven't pulled Meta changes.
  const cfg = await prisma.channelConfig.findFirst({
    where: { organizationId: orgId, channelType: "whatsapp", isActive: true },
    select: {
      accessToken: true, apiKey: true,
      phoneNumberId: true, phoneNumber: true,
      displayName: true,
      lastValidatedAt: true, lastTemplateSyncAt: true,
    },
  })
  const meta = {
    hasConfig: !!(cfg && (cfg.accessToken || cfg.apiKey) && (cfg.phoneNumberId || cfg.phoneNumber)),
    phoneNumberId: cfg?.phoneNumberId || cfg?.phoneNumber || null,
    displayName: cfg?.displayName || null,
    lastValidatedAt: cfg?.lastValidatedAt?.toISOString() || null,
    lastTemplateSyncAt: cfg?.lastTemplateSyncAt?.toISOString() || null,
  }

  if (status === "APPROVED") {
    const data = await listApprovedTemplates(orgId, { language, category })
    return NextResponse.json({ success: true, data, meta })
  }

  const data = await prisma.whatsAppTemplate.findMany({
    where: {
      organizationId: orgId,
      ...(status !== "all" ? { status } : {}),
      ...(language ? { language } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: [{ status: "asc" }, { category: "asc" }, { name: "asc" }],
  })
  return NextResponse.json({ success: true, data, meta })
}

// POST /api/v1/whatsapp/templates
// Triggers a Meta Graph API sync. No body needed.
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await syncTemplatesFromMeta(orgId)
  return NextResponse.json(result, { status: result.success ? 200 : 502 })
}
