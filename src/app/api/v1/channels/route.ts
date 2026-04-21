import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createChannelSchema = z.object({
  channelType: z.string().min(1),
  configName: z.string().min(1).max(200),
  botToken: z.string().optional(),
  webhookUrl: z.string().optional(),
  apiKey: z.string().optional(),
  phoneNumber: z.string().optional(),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  pageId: z.string().optional(),
  settings: z.any().optional(),
  isActive: z.boolean().optional().default(true),
  // Multi-tenant WhatsApp fields (phase 1+). All optional — only relevant
  // when channelType === "whatsapp".
  accessToken: z.string().optional(),
  phoneNumberId: z.string().optional(),
  businessAccountId: z.string().optional(),
  verifyToken: z.string().optional(),
  displayName: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const channels = await prisma.channelConfig.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        channelType: true,
        configName: true,
        phoneNumber: true,
        pageId: true,
        appId: true,
        webhookUrl: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        // Exclude sensitive fields: botToken, apiKey, appSecret
      },
    })

    return NextResponse.json({ success: true, data: channels })
  } catch {
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createChannelSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // For whatsapp rows, mirror the new fields back into the legacy trio so
    // the library's legacy-fallback continues to read the same values during
    // the transition. Remove the mirror once all readers switched to new
    // columns exclusively.
    const d = parsed.data
    const data =
      d.channelType === "whatsapp"
        ? {
            ...d,
            apiKey:      d.accessToken       || d.apiKey,
            phoneNumber: d.phoneNumberId     || d.phoneNumber,
            webhookUrl:  d.businessAccountId || d.webhookUrl,
          }
        : d

    const channel = await prisma.channelConfig.create({
      data: {
        organizationId: orgId,
        ...data,
      },
    })
    return NextResponse.json({ success: true, data: channel }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
