import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const updateChannelSchema = z.object({
  channelType: z.string().min(1).optional(),
  configName: z.string().min(1).max(200).optional(),
  botToken: z.string().optional(),
  webhookUrl: z.string().optional(),
  apiKey: z.string().optional(),
  phoneNumber: z.string().optional(),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  pageId: z.string().optional(),
  settings: z.any().optional(),
  isActive: z.boolean().optional(),
  // Multi-tenant WhatsApp fields
  accessToken: z.string().optional(),
  phoneNumberId: z.string().optional(),
  businessAccountId: z.string().optional(),
  verifyToken: z.string().optional(),
  displayName: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const channel = await prisma.channelConfig.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })
    // Mask sensitive fields
    const masked = {
      ...channel,
      botToken: channel.botToken ? `****${channel.botToken.slice(-4)}` : null,
      apiKey: channel.apiKey ? `****${channel.apiKey.slice(-4)}` : null,
      appSecret: channel.appSecret ? `****${channel.appSecret.slice(-4)}` : null,
    }
    return NextResponse.json({ success: true, data: masked })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateChannelSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Mirror new WhatsApp fields into the legacy trio during transition.
    const d = parsed.data as Record<string, any>
    const row = await prisma.channelConfig.findFirst({ where: { id, organizationId: orgId } })
    const isWa = row?.channelType === "whatsapp" || d.channelType === "whatsapp"
    const data = isWa
      ? {
          ...d,
          apiKey:      d.accessToken       ?? d.apiKey,
          phoneNumber: d.phoneNumberId     ?? d.phoneNumber,
          webhookUrl:  d.businessAccountId ?? d.webhookUrl,
        }
      : d

    const result = await prisma.channelConfig.updateMany({
      where: { id, organizationId: orgId },
      data,
    })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const updated = await prisma.channelConfig.findFirst({ where: { id, organizationId: orgId } })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const result = await prisma.channelConfig.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
