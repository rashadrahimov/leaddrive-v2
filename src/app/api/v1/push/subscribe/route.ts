import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const userAgent = req.headers.get("user-agent") || null

  // Upsert on endpoint (same browser/device reuses the same endpoint URL)
  const record = await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: {
      organizationId: auth.orgId,
      userId: auth.userId,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent,
    },
    create: {
      organizationId: auth.orgId,
      userId: auth.userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent,
    },
  })

  return NextResponse.json({ success: true, data: { id: record.id } })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(req.url)
  const endpoint = searchParams.get("endpoint")
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: auth.userId },
  })
  return NextResponse.json({ success: true })
}
