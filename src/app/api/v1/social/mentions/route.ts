import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "campaigns", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || undefined
  const platform = searchParams.get("platform") || undefined
  const sentiment = searchParams.get("sentiment") || undefined
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)

  const mentions = await prisma.socialMention.findMany({
    where: {
      organizationId: orgId,
      // See excludeSentinel note below — exclude the telegram cursor row.
      externalId: { not: "__tg_offset__" },
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(sentiment ? { sentiment } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { account: { select: { handle: true, displayName: true } } },
  })

  // Telegram poller stores its offset cursor as a sentinel row with a
  // well-known externalId. Exclude it by exact name. (Earlier `startsWith:
  // "__"` was broken — underscores are SQL LIKE wildcards.)
  const excludeSentinel = { externalId: { not: "__tg_offset__" } }
  const [totals, byStatus, bySentiment] = await Promise.all([
    prisma.socialMention.count({ where: { organizationId: orgId, ...excludeSentinel } }),
    prisma.socialMention.groupBy({
      by: ["status"],
      where: { organizationId: orgId, ...excludeSentinel },
      _count: true,
    }),
    prisma.socialMention.groupBy({
      by: ["sentiment"],
      where: { organizationId: orgId, ...excludeSentinel },
      _count: true,
    }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      mentions,
      stats: {
        total: totals,
        byStatus: Object.fromEntries(byStatus.map((g: { status: string; _count: number }) => [g.status, g._count])),
        bySentiment: Object.fromEntries(
          bySentiment.map((g: { sentiment: string | null; _count: number }) => [g.sentiment ?? "unknown", g._count]),
        ),
      },
    },
  })
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "reviewed", "replied", "ignored", "converted_to_ticket", "converted_to_lead", "converted_to_task"]).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req, "campaigns", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const session = { userId: auth.userId }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const existing = await prisma.socialMention.findFirst({
    where: { id: parsed.data.id, organizationId: orgId },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.socialMention.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status, handledAt: new Date(), handledBy: session?.userId } : {}),
      ...(parsed.data.sentiment ? { sentiment: parsed.data.sentiment } : {}),
    },
  })
  return NextResponse.json({ success: true, data: updated })
}
