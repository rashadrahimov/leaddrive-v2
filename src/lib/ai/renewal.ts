import Anthropic from "@anthropic-ai/sdk"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { calculateAiCost } from "@/lib/ai/budget"

const RENEWAL_MODEL = "claude-haiku-4-5-20251001"
const SKIP_STATUSES = ["expired", "terminated", "draft", "cancelled", "rejected"]
const WINDOW_DAYS_START = 28
const WINDOW_DAYS_END = 32

type ContractWithRefs = Prisma.ContractGetPayload<{
  include: {
    company: { select: { id: true; name: true } }
    contact: { select: { id: true; firstName: true; lastName: true; email: true } }
  }
}>

async function fetchContractsInWindow(orgId: string, now: Date): Promise<ContractWithRefs[]> {
  const windowStart = new Date(now.getTime() + WINDOW_DAYS_START * 86400000)
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS_END * 86400000)

  return prisma.contract.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: SKIP_STATUSES },
      endDate: { gte: windowStart, lte: windowEnd },
    },
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  })
}

export async function findContractsForRenewal(orgId: string, now: Date) {
  const contracts = await fetchContractsInWindow(orgId, now)
  if (contracts.length === 0) return []

  const ids = contracts.map(c => c.id)
  const recent = new Date(now.getTime() - 14 * 86400000)
  const existing = await prisma.aiShadowAction.findMany({
    where: {
      organizationId: orgId,
      featureName: { in: ["ai_auto_renewal", "ai_auto_renewal_shadow"] },
      entityType: "contract",
      entityId: { in: ids },
      OR: [{ approved: null }, { reviewedAt: { gte: recent } }],
    },
    select: { entityId: true },
  })
  const skip = new Set(existing.map((e: { entityId: string }) => e.entityId))
  return contracts.filter(c => !skip.has(c.id))
}

export interface RenewalDraft {
  proposedValue: number
  reasoning: string
  emailSubject: string
  emailBody: string
}

export async function generateRenewalProposal(
  contract: ContractWithRefs,
  orgName: string,
): Promise<RenewalDraft | null> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const currentValue = contract.valueAmount || 0
  const currency = contract.currency || "USD"
  const companyName = contract.company?.name || "the client"
  const contactName = contract.contact
    ? `${contract.contact.firstName} ${contract.contact.lastName || ""}`.trim()
    : "there"
  const contactEmail = contract.contact?.email || ""
  const endDateIso = contract.endDate ? contract.endDate.toISOString().slice(0, 10) : "soon"

  const prompt = `You are a CRM assistant drafting a contract renewal proposal.

Contract:
- Company: ${companyName}
- Current value: ${currentValue} ${currency}
- Ends: ${endDateIso}
- Type: ${contract.type || "service agreement"}

Contact: ${contactName} <${contactEmail}>

Pricing guidance (be conservative):
- value < 100 → increase 5-8%
- value 100–1000 → increase 3-5%
- value > 1000 → increase 2-3%, round to nearest 100

Draft a renewal proposal. Output STRICT JSON only (no markdown, no code fences):
{
  "proposedValue": <number>,
  "reasoning": "<one short sentence>",
  "emailSubject": "<subject line>",
  "emailBody": "<HTML email body, 80–120 words. Address ${contactName} by name. Mention end date, proposed value and currency, call-to-action. Sign as '${orgName}'. Use <p> tags only.>"
}`

  const start = Date.now()
  let response: any
  try {
    response = await anthropic.messages.create({
      model: RENEWAL_MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    })
  } catch (e) {
    console.error("Renewal AI call failed:", e)
    return null
  }

  const textBlock = response.content?.find?.((b: any) => b.type === "text") as any
  const raw: string = textBlock?.text ?? "{}"
  const cleaned = raw.replace(/```(?:json)?\s*|\s*```/g, "").trim()

  let parsed: Partial<RenewalDraft> = {}
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = {}
  }

  const fallbackValue = Math.max(1, Math.round(currentValue * 1.05))
  const draft: RenewalDraft = {
    proposedValue: Number(parsed.proposedValue) > 0 ? Number(parsed.proposedValue) : fallbackValue,
    reasoning: String(parsed.reasoning || "Standard 5% renewal uplift").slice(0, 240),
    emailSubject: String(parsed.emailSubject || `${companyName} — Contract Renewal Proposal`).slice(0, 200),
    emailBody: String(parsed.emailBody || defaultEmailBody(contactName, endDateIso, fallbackValue, currency, orgName)).slice(0, 5000),
  }

  const inputTokens = response.usage?.input_tokens || 0
  const outputTokens = response.usage?.output_tokens || 0
  const cost = calculateAiCost(RENEWAL_MODEL, inputTokens, outputTokens)

  await prisma.aiInteractionLog.create({
    data: {
      organizationId: contract.organizationId,
      userMessage: `renewal_draft:${contract.id}`,
      aiResponse: cleaned.slice(0, 2000),
      model: RENEWAL_MODEL,
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      costUsd: cost,
      latencyMs: Date.now() - start,
    },
  }).catch(() => {})

  return draft
}

function defaultEmailBody(contactName: string, endDate: string, value: number, currency: string, orgName: string) {
  return `<p>Hello ${contactName},</p>
<p>Your current agreement with ${orgName} ends on ${endDate}. We'd like to propose renewing at ${value} ${currency} for the next term.</p>
<p>Reply to confirm, or let us know a good time for a quick call to discuss adjustments.</p>
<p>— ${orgName}</p>`
}

export async function writeRenewalShadowAction(
  orgId: string,
  contract: ContractWithRefs,
  draft: RenewalDraft,
  now: Date,
  shadow: boolean,
) {
  const daysUntilEnd = contract.endDate
    ? Math.max(0, Math.floor((contract.endDate.getTime() - now.getTime()) / 86400000))
    : 0

  await prisma.aiShadowAction.create({
    data: {
      organizationId: orgId,
      featureName: shadow ? "ai_auto_renewal_shadow" : "ai_auto_renewal",
      entityType: "contract",
      entityId: contract.id,
      actionType: "send_renewal_proposal",
      payload: {
        contractNumber: contract.contractNumber,
        contractTitle: contract.title,
        companyId: contract.company?.id || null,
        companyName: contract.company?.name || null,
        contactId: contract.contact?.id || null,
        contactEmail: contract.contact?.email || null,
        currentValue: contract.valueAmount || 0,
        proposedValue: draft.proposedValue,
        currency: contract.currency || "USD",
        daysUntilEnd,
        endDate: contract.endDate?.toISOString() || null,
        reasoning: draft.reasoning,
        emailSubject: draft.emailSubject,
        emailBody: draft.emailBody,
        // If not shadow (live mode), mark pre-approved so executor picks it up next run
        ...(shadow ? {} : { autoApproved: true }),
      },
      approved: shadow ? null : true,
      reviewedAt: shadow ? null : now,
      reviewedBy: shadow ? null : "system",
    },
  })
}
