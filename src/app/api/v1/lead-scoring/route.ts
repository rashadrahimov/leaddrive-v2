import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import Anthropic from "@anthropic-ai/sdk"

function getGrade(score: number): string {
  if (score >= 80) return "A"
  if (score >= 60) return "B"
  if (score >= 40) return "C"
  if (score >= 20) return "D"
  return "F"
}

// Rule-based fallback when no API key
function scoreLeadRuleBased(lead: any): { score: number; factors: Record<string, number>; conversionProb: number; reasoning: string } {
  const factors: Record<string, number> = {}
  let score = 0

  if (lead.email) { factors.email = 15; score += 15 }
  if (lead.phone) { factors.phone = 10; score += 10 }
  if (lead.companyName) { factors.company = 10; score += 10 }
  if (lead.source === "referral") { factors.source = 20; score += 20 }
  else if (lead.source === "website") { factors.source = 15; score += 15 }
  else if (lead.source === "email") { factors.source = 10; score += 10 }
  else if (lead.source) { factors.source = 5; score += 5 }
  if (lead.priority === "high") { factors.priority = 15; score += 15 }
  else if (lead.priority === "medium") { factors.priority = 10; score += 10 }
  else { factors.priority = 5; score += 5 }
  if (lead.estimatedValue && lead.estimatedValue > 0) { factors.value = 10; score += 10 }
  if (lead.status === "qualified") { factors.status = 15; score += 15 }
  else if (lead.status === "contacted") { factors.status = 10; score += 10 }
  else if (lead.status === "converted") { factors.status = 20; score += 20 }
  if (lead.notes && lead.notes.length > 10) { factors.notes = 5; score += 5 }

  score = Math.min(score, 100)
  const conversionProb = Math.round(score * 0.85)
  return { score, factors, conversionProb, reasoning: "Rule-based scoring (AI API key not configured)" }
}

// AI-powered scoring with Claude
async function scoreLeadWithAI(
  client: Anthropic,
  lead: any,
  activities: any[],
  deals: any[],
): Promise<{ score: number; factors: Record<string, number>; conversionProb: number; reasoning: string }> {
  const leadContext = `
Lead: ${lead.contactName}
Company: ${lead.companyName || "Unknown"}
Email: ${lead.email || "None"}
Phone: ${lead.phone || "None"}
Source: ${lead.source || "Unknown"}
Status: ${lead.status}
Priority: ${lead.priority}
Estimated Value: ${lead.estimatedValue ? `$${lead.estimatedValue}` : "Not set"}
Notes: ${lead.notes || "None"}
Created: ${lead.createdAt}

Activities (${activities.length}):
${activities.length > 0
  ? activities.slice(0, 10).map(a => `- ${a.type}: ${a.subject || a.description || "No details"} (${a.createdAt})`).join("\n")
  : "No activities recorded"}

Related Deals (${deals.length}):
${deals.length > 0
  ? deals.map(d => `- ${d.name}: stage=${d.stage}, value=$${d.valueAmount} ${d.currency}`).join("\n")
  : "No deals"}
`.trim()

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are a CRM lead scoring AI for an IT outsourcing company. Analyze this lead and provide a quality score.

${leadContext}

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{
  "score": <0-100 integer>,
  "conversionProb": <0-100 integer, realistic conversion probability>,
  "factors": {
    "contactCompleteness": <0-20>,
    "sourceQuality": <0-20>,
    "engagementLevel": <0-20>,
    "dealPotential": <0-20>,
    "recency": <0-20>
  },
  "reasoning": "<1-2 sentence explanation in Russian>"
}`
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const parsed = JSON.parse(text)
    return {
      score: Math.min(100, Math.max(0, parsed.score || 0)),
      factors: parsed.factors || {},
      conversionProb: Math.min(100, Math.max(0, parsed.conversionProb || 0)),
      reasoning: parsed.reasoning || "AI analysis complete",
    }
  } catch (e) {
    console.error("AI scoring failed, using rule-based fallback:", e)
    return scoreLeadRuleBased(lead)
  }
}

// GET — list leads with scores
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    orderBy: { score: "desc" },
  })

  return NextResponse.json({
    success: true,
    data: {
      leads: leads.map(l => {
        const details = (l.scoreDetails as any) || {}
        return {
          id: l.id,
          contactName: l.contactName,
          companyName: l.companyName,
          email: l.email,
          source: l.source,
          status: l.status,
          priority: l.priority,
          score: l.score,
          scoreDetails: l.scoreDetails,
          grade: getGrade(l.score),
          conversionProb: details.conversionProb ?? Math.round(l.score * 0.85),
          reasoning: details.reasoning || null,
          lastScoredAt: l.lastScoredAt,
          estimatedValue: l.estimatedValue,
        }
      }),
      total: leads.length,
    },
  })
}

// POST — score leads with AI (or rule-based fallback)
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const leadId = body.leadId as string | undefined

  const where: any = { organizationId: orgId }
  if (leadId) where.id = leadId

  const leads = await prisma.lead.findMany({ where })

  const apiKey = process.env.ANTHROPIC_API_KEY
  const useAI = !!apiKey
  let client: Anthropic | null = null

  if (useAI) {
    client = new Anthropic({ apiKey })
  }

  let scored = 0
  const results: Array<{ id: string; name: string; score: number; grade: string }> = []

  for (const lead of leads) {
    let result: { score: number; factors: Record<string, number>; conversionProb: number; reasoning: string }

    if (useAI && client) {
      // Fetch related data for AI context
      const [activities, deals] = await Promise.all([
        prisma.activity.findMany({
          where: { organizationId: orgId, contactId: lead.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }).catch(() => []),
        prisma.deal.findMany({
          where: { organizationId: orgId },
          take: 5,
        }).catch(() => []),
      ])

      result = await scoreLeadWithAI(client, lead, activities, deals)
    } else {
      result = scoreLeadRuleBased(lead)
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        score: result.score,
        scoreDetails: {
          factors: result.factors,
          conversionProb: result.conversionProb,
          grade: getGrade(result.score),
          reasoning: result.reasoning,
          aiPowered: useAI,
        },
        lastScoredAt: new Date(),
      },
    })

    results.push({ id: lead.id, name: lead.contactName, score: result.score, grade: getGrade(result.score) })
    scored++
  }

  return NextResponse.json({
    success: true,
    data: {
      scored,
      aiPowered: useAI,
      results,
    },
  })
}
