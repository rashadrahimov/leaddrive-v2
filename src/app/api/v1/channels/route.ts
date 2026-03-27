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
    const channel = await prisma.channelConfig.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: channel }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
