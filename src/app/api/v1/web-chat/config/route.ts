import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  let widget = await prisma.webChatWidget.findUnique({ where: { organizationId: orgId } })
  if (!widget) {
    widget = await prisma.webChatWidget.create({
      data: {
        organizationId: orgId,
        publicKey: "wc_" + randomBytes(9).toString("hex"),
      },
    })
  }

  return NextResponse.json({ success: true, data: widget })
}

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().max(100).optional(),
  greeting: z.string().max(500).optional(),
  primaryColor: z.string().max(20).optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  showLauncher: z.boolean().optional(),
  aiEnabled: z.boolean().optional(),
  escalateToTicket: z.boolean().optional(),
  allowedOrigins: z.array(z.string()).optional(),
  offlineMessage: z.string().max(500).nullable().optional(),
  workingHours: z.record(z.string(), z.any()).nullable().optional(),
})

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, "inbox", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const widget = await prisma.webChatWidget.upsert({
    where: { organizationId: orgId },
    update: parsed.data,
    create: {
      organizationId: orgId,
      publicKey: "wc_" + randomBytes(9).toString("hex"),
      ...parsed.data,
    },
  })

  return NextResponse.json({ success: true, data: widget })
}

export async function POST(req: NextRequest) {
  // Regenerate public key
  const auth = await requireAuth(req, "inbox", "admin")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const widget = await prisma.webChatWidget.upsert({
    where: { organizationId: orgId },
    update: { publicKey: "wc_" + randomBytes(9).toString("hex") },
    create: {
      organizationId: orgId,
      publicKey: "wc_" + randomBytes(9).toString("hex"),
    },
  })
  return NextResponse.json({ success: true, data: widget })
}
