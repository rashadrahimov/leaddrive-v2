import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "campaigns", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const accounts = await prisma.socialAccount.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })
  // Redact raw accessToken; expose only a boolean "connected" flag
  const sanitized = accounts.map((a: any) => {
    const { accessToken, ...rest } = a
    return { ...rest, connected: !!accessToken, accessToken: accessToken ? "***" : null }
  })
  return NextResponse.json({ success: true, data: { accounts: sanitized } })
}

const createSchema = z.object({
  platform: z.enum(["twitter", "instagram", "facebook", "telegram", "vkontakte", "youtube", "tiktok"]),
  handle: z.string().min(1).max(200),
  displayName: z.string().max(200).optional(),
  keywords: z.array(z.string().max(100)).optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "campaigns", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const account = await prisma.socialAccount.create({
      data: {
        organizationId: orgId,
        platform: parsed.data.platform,
        handle: parsed.data.handle,
        displayName: parsed.data.displayName,
        keywords: parsed.data.keywords || [],
      },
    })
    logAudit(orgId, "create", "social_account", account.id, `${account.platform}:${account.handle}`)
    return NextResponse.json({ success: true, data: account }, { status: 201 })
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Account already exists" }, { status: 409 })
    }
    throw e
  }
}
