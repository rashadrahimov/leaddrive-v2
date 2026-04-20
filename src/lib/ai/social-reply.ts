import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { calculateAiCost } from "@/lib/ai/budget"

const REPLY_MODEL = "claude-haiku-4-5-20251001"

export interface SocialReplyDraft {
  reply: string
  tone: "apologetic" | "supportive" | "informative" | "grateful"
  reasoning: string
}

export async function findMentionsForReply(orgId: string, now: Date) {
  const recent = new Date(now.getTime() - 24 * 3600000)

  // Target: new negative/neutral mentions on platforms that support replying
  const mentions = await prisma.socialMention.findMany({
    where: {
      organizationId: orgId,
      status: "new",
      createdAt: { gte: recent },
      sentiment: { in: ["negative", "neutral"] },
      platform: { in: ["twitter", "facebook", "instagram"] },
    },
    select: {
      id: true, organizationId: true, platform: true, text: true,
      authorName: true, authorHandle: true, sentiment: true, externalId: true,
    },
    take: 15,
    orderBy: { createdAt: "desc" },
  })
  if (mentions.length === 0) return []

  const existing = await prisma.aiShadowAction.findMany({
    where: {
      organizationId: orgId,
      featureName: { in: ["ai_auto_social_reply", "ai_auto_social_reply_shadow"] },
      entityType: "social_mention",
      entityId: { in: mentions.map((m: { id: string }) => m.id) },
      OR: [{ approved: null }, { reviewedAt: { gte: new Date(now.getTime() - 3 * 86400000) } }],
    },
    select: { entityId: true },
  })
  const skip = new Set(existing.map((e: { entityId: string }) => e.entityId))
  return mentions.filter((m: { id: string }) => !skip.has(m.id))
}

export async function draftSocialReply(
  mention: { id: string; organizationId: string; platform: string; text: string; authorName: string | null; authorHandle: string | null; sentiment: string | null },
  orgName: string,
  lang: string = "en",
): Promise<SocialReplyDraft | null> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const langLabel = lang === "ru" ? "Russian" : lang === "az" ? "Azerbaijani" : "English"
  const prompt = `You are a social-media community manager drafting a reply to a brand mention.

Platform: ${mention.platform}
Author: ${mention.authorName || mention.authorHandle || "user"}
Sentiment: ${mention.sentiment || "unknown"}

Mention text:
"${mention.text.slice(0, 1500)}"

Draft a reply that:
- Is under 280 characters (Twitter limit is hard).
- Matches the inferred tone: apologetic for legit complaints, supportive for frustration, informative for questions, grateful for praise.
- Does NOT make promises you can't keep (no "we'll refund", no "it will be fixed today").
- Invites the conversation to move to DM or email if the issue is complex.
- Never uses hashtags or emojis unless the author used them first.
- Signs with no signature (community-manager style).
- Is written in ${langLabel}.

Output STRICT JSON (no markdown, no code fences):
{
  "reply": "<the reply text>",
  "tone": "<apologetic | supportive | informative | grateful>",
  "reasoning": "<1 short sentence in English describing the strategy>"
}`

  const start = Date.now()
  let response: any
  try {
    response = await anthropic.messages.create({
      model: REPLY_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (e) {
    console.error("Social reply AI call failed:", e)
    return null
  }

  const textBlock = response.content?.find?.((b: any) => b.type === "text") as any
  const raw: string = textBlock?.text ?? "{}"
  const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim()

  let parsed: Partial<SocialReplyDraft> = {}
  try { parsed = JSON.parse(cleaned) } catch { return null }

  const reply = String(parsed.reply || "").trim()
  if (!reply) return null

  const tones = ["apologetic", "supportive", "informative", "grateful"] as const
  const tone = (tones as readonly string[]).includes(parsed.tone as any) ? (parsed.tone as SocialReplyDraft["tone"]) : "informative"
  const reasoning = String(parsed.reasoning || "").slice(0, 240)

  const inputTokens = response.usage?.input_tokens || 0
  const outputTokens = response.usage?.output_tokens || 0
  const cost = calculateAiCost(REPLY_MODEL, inputTokens, outputTokens)

  await prisma.aiInteractionLog.create({
    data: {
      organizationId: mention.organizationId,
      userMessage: `social_reply:${mention.id}`,
      aiResponse: cleaned.slice(0, 1000),
      model: REPLY_MODEL,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      costUsd: cost,
      latencyMs: Date.now() - start,
    },
  }).catch(() => {})

  return { reply: reply.slice(0, 280), tone, reasoning }
}

export async function writeSocialReplyShadowAction(
  orgId: string,
  mention: { id: string; platform: string; authorHandle: string | null; authorName: string | null; text: string; sentiment: string | null; externalId: string },
  draft: SocialReplyDraft,
  now: Date,
  shadow: boolean,
) {
  await prisma.aiShadowAction.create({
    data: {
      organizationId: orgId,
      featureName: shadow ? "ai_auto_social_reply_shadow" : "ai_auto_social_reply",
      entityType: "social_mention",
      entityId: mention.id,
      actionType: "post_social_reply",
      payload: {
        platform: mention.platform,
        authorHandle: mention.authorHandle,
        authorName: mention.authorName,
        mentionExcerpt: mention.text.slice(0, 200),
        mentionSentiment: mention.sentiment,
        replyText: draft.reply,
        tone: draft.tone,
        reasoning: draft.reasoning,
      },
      approved: shadow ? null : true,
      reviewedAt: shadow ? null : now,
      reviewedBy: shadow ? null : "system",
    },
  })
}
