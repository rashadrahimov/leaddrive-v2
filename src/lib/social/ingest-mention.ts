import { prisma } from "@/lib/prisma"
import { executeWorkflows } from "@/lib/workflow-engine"

/**
 * Insert-or-update a social mention. Returns true when a new row was created,
 * false on a duplicate (already present, fields refreshed). On creation we
 * fire workflow rules for entityType='social_mention', triggerEvent='created'.
 *
 * The find-then-create pattern (instead of pure upsert) is what lets us tell
 * "first time we see this comment" from "we already had it" — Prisma's upsert
 * doesn't expose that flag.
 */
export interface IngestInput {
  organizationId: string
  accountId: string
  platform: string
  externalId: string
  text: string
  sentiment: "positive" | "neutral" | "negative" | null
  matchedTerm: string | null
  engagement?: number
  reach?: number
  url?: string | null
  authorName?: string | null
  authorHandle?: string | null
  publishedAt?: Date | null
}

export async function ingestMention(input: IngestInput): Promise<boolean> {
  const existing = await prisma.socialMention.findUnique({
    where: {
      organizationId_platform_externalId: {
        organizationId: input.organizationId,
        platform: input.platform,
        externalId: input.externalId,
      },
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.socialMention.update({
      where: { id: existing.id },
      data: {
        text: input.text,
        sentiment: input.sentiment,
        engagement: input.engagement ?? 0,
      },
    })
    return false
  }

  const created = await prisma.socialMention.create({
    data: {
      organizationId: input.organizationId,
      accountId: input.accountId,
      platform: input.platform,
      externalId: input.externalId,
      text: input.text,
      sentiment: input.sentiment,
      matchedTerm: input.matchedTerm,
      engagement: input.engagement ?? 0,
      reach: input.reach ?? 0,
      url: input.url ?? null,
      authorName: input.authorName ?? null,
      authorHandle: input.authorHandle ?? null,
      publishedAt: input.publishedAt ?? null,
    },
  })

  // Fire-and-forget — don't block ingestion on workflow side-effects.
  executeWorkflows(input.organizationId, "social_mention", "created", {
    id: created.id,
    platform: created.platform,
    sentiment: created.sentiment,
    text: created.text,
    authorName: created.authorName,
    authorHandle: created.authorHandle,
    url: created.url,
    matchedTerm: created.matchedTerm,
    engagement: created.engagement,
    publishedAt: created.publishedAt,
  }).catch(e => console.error("[ingestMention] workflow execution failed:", e))

  return true
}
