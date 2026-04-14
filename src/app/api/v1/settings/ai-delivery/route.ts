import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const DELIVERY_KEYS = ["telegramBotToken", "telegramChatId", "slackWebhookUrl", "language"]

/**
 * GET /api/v1/settings/ai-delivery — read delivery channel settings
 * PATCH /api/v1/settings/ai-delivery — update delivery channel settings
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })

  const settings = (org?.settings as Record<string, any>) || {}

  return NextResponse.json({
    data: {
      telegramBotToken: settings.telegramBotToken || "",
      telegramChatId: settings.telegramChatId || "",
      slackWebhookUrl: settings.slackWebhookUrl || "",
      language: settings.language || "ru",
    },
  })
}

export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })

  const settings = (org?.settings as Record<string, any>) || {}

  // Only update allowed delivery keys
  for (const key of DELIVERY_KEYS) {
    if (key in body) {
      settings[key] = typeof body[key] === "string" ? body[key].trim() : body[key]
    }
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: { settings },
  })

  return NextResponse.json({
    data: {
      telegramBotToken: settings.telegramBotToken || "",
      telegramChatId: settings.telegramChatId || "",
      slackWebhookUrl: settings.slackWebhookUrl || "",
      language: settings.language || "ru",
    },
  })
}
