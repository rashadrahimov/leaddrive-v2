import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import crypto from "crypto"

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const webhooks = await prisma.webhook.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: webhooks })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const secret = crypto.randomBytes(32).toString("hex")

  const webhook = await prisma.webhook.create({
    data: {
      organizationId: orgId,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
      isActive: true,
    },
  })

  // Return secret only on creation
  return NextResponse.json({ success: true, data: { ...webhook, secret } }, { status: 201 })
}
