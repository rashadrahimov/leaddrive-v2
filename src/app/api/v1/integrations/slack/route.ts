import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendSlackNotification } from "@/lib/slack"

const slackConfigSchema = z.object({
  configName: z.string().min(1).max(255),
  webhookUrl: z.string().url(),
  settings: z.object({
    channels: z.array(z.string()).optional(),
  }).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const configs = await prisma.channelConfig.findMany({
    where: { organizationId: orgId, channelType: "slack" },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: configs })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Test action
  if (body.action === "test" && body.webhookUrl) {
    const success = await sendSlackNotification(body.webhookUrl, {
      text: "LeadDrive CRM test message - integration is working!",
    })
    return NextResponse.json({ success, message: success ? "Test message sent" : "Failed to send test message" })
  }

  const parsed = slackConfigSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const config = await prisma.channelConfig.create({
    data: {
      organizationId: orgId,
      channelType: "slack",
      configName: parsed.data.configName,
      webhookUrl: parsed.data.webhookUrl,
      settings: parsed.data.settings ?? {},
      isActive: true,
    },
  })

  return NextResponse.json({ success: true, data: config }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, ...updateData } = body

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const result = await prisma.channelConfig.updateMany({
    where: { id, organizationId: orgId, channelType: "slack" },
    data: updateData,
  })

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.channelConfig.findFirst({ where: { id } })
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const result = await prisma.channelConfig.deleteMany({
    where: { id, organizationId: orgId, channelType: "slack" },
  })

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: { deleted: id } })
}
