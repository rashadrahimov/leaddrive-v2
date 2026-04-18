import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { classifySentiment, crudeSentiment } from "@/lib/sentiment"

const mentionSchema = z.object({
  platform: z.string().min(1).max(30),
  externalId: z.string().min(1).max(200),
  text: z.string().min(1).max(10000),
  authorName: z.string().max(200).optional(),
  authorHandle: z.string().max(200).optional(),
  authorAvatar: z.string().max(500).optional(),
  url: z.string().max(2000).optional(),
  matchedTerm: z.string().max(200).optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
  reach: z.number().int().min(0).optional(),
  engagement: z.number().int().min(0).optional(),
  publishedAt: z.string().datetime().optional(),
  accountHandle: z.string().max(200).optional(),  // matched against social_accounts.handle
})

const payloadSchema = z.union([
  mentionSchema,
  z.object({ mentions: z.array(mentionSchema).min(1).max(100) }),
])

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const items = "mentions" in parsed.data ? parsed.data.mentions : [parsed.data]
  const results: any[] = []

  for (const item of items) {
    let accountId: string | null = null
    if (item.accountHandle) {
      const account = await prisma.socialAccount.findFirst({
        where: { organizationId: orgId, platform: item.platform, handle: item.accountHandle },
      })
      if (account) accountId = account.id
    }

    try {
      const sentiment = item.sentiment || (await classifySentiment(item.text))
      const mention = await prisma.socialMention.upsert({
        where: {
          organizationId_platform_externalId: {
            organizationId: orgId,
            platform: item.platform,
            externalId: item.externalId,
          },
        },
        update: {
          text: item.text,
          reach: item.reach ?? 0,
          engagement: item.engagement ?? 0,
          sentiment,
        },
        create: {
          organizationId: orgId,
          accountId,
          platform: item.platform,
          externalId: item.externalId,
          text: item.text,
          authorName: item.authorName,
          authorHandle: item.authorHandle,
          authorAvatar: item.authorAvatar,
          url: item.url,
          matchedTerm: item.matchedTerm,
          sentiment,
          reach: item.reach ?? 0,
          engagement: item.engagement ?? 0,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
        },
      })
      results.push({ id: mention.id, externalId: item.externalId })
    } catch (e: any) {
      // If AI classify fails inside upsert, fall back to crudeSentiment for this item
      if (String(e?.message || "").includes("sentiment")) {
        const fallback = crudeSentiment(item.text)
        try {
          const mention = await prisma.socialMention.upsert({
            where: {
              organizationId_platform_externalId: {
                organizationId: orgId,
                platform: item.platform,
                externalId: item.externalId,
              },
            },
            update: { text: item.text, sentiment: fallback },
            create: {
              organizationId: orgId,
              accountId,
              platform: item.platform,
              externalId: item.externalId,
              text: item.text,
              sentiment: fallback,
              publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            },
          })
          results.push({ id: mention.id, externalId: item.externalId, note: "sentiment fallback" })
        } catch (e2: any) {
          results.push({ externalId: item.externalId, error: e2?.message || "insert failed" })
        }
      } else {
        results.push({ externalId: item.externalId, error: e?.message || "insert failed" })
      }
    }
  }

  return NextResponse.json({ success: true, data: { ingested: results.length, results } })
}
