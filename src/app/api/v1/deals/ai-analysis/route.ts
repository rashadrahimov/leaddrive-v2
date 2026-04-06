import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const MODEL = process.env.MANAGER_MODEL || "claude-sonnet-4-5-20250929"

const LANG_MAP: Record<string, { name: string; instruction: string }> = {
  az: { name: "Azerbaijani", instruction: "Cavab Azərbaycan dilində olmalıdır." },
  ru: { name: "Russian", instruction: "Ответ должен быть на русском языке." },
  en: { name: "English", instruction: "Answer in English." },
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: "AI service not configured" }, { status: 503 })

  let body: { lang?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const lang = body.lang && LANG_MAP[body.lang] ? body.lang : "en"
  const langCfg = LANG_MAP[lang]

  // Load all deals with related data
  const deals = await prisma.deal.findMany({
    where: { organizationId: orgId },
    include: {
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  if (deals.length === 0) {
    return NextResponse.json({ error: "No deals found" }, { status: 404 })
  }

  // Compute stats
  const stages: Record<string, { count: number; value: number }> = {}
  let totalValue = 0
  let wonValue = 0
  let lostCount = 0
  const currencies: Record<string, number> = {}

  for (const d of deals) {
    const stage = d.stage || "UNKNOWN"
    if (!stages[stage]) stages[stage] = { count: 0, value: 0 }
    stages[stage].count++
    stages[stage].value += d.valueAmount || 0
    totalValue += d.valueAmount || 0
    if (stage === "WON") wonValue += d.valueAmount || 0
    if (stage === "LOST") lostCount++
    const cur = d.currency || "AZN"
    currencies[cur] = (currencies[cur] || 0) + (d.valueAmount || 0)
  }

  const winRate = deals.length > 0
    ? Math.round((stages["WON"]?.count || 0) / deals.length * 100)
    : 0

  const stageLines = Object.entries(stages)
    .map(([stage, data]) => `  - ${stage}: ${data.count} deals, ${data.value.toLocaleString()} total`)
    .join("\n")

  const topDeals = deals
    .filter((d: any) => d.stage !== "LOST")
    .sort((a: any, b: any) => (b.valueAmount || 0) - (a.valueAmount || 0))
    .slice(0, 10)
    .map((d: any) => `  - "${d.name}" (${d.company?.name || "no company"}) — ${(d.valueAmount || 0).toLocaleString()} ${d.currency || "AZN"}, stage: ${d.stage}, prob: ${d.probability || 0}%${d.expectedCloseDate ? `, close: ${new Date(d.expectedCloseDate).toLocaleDateString()}` : ""}`)
    .join("\n")

  const recentLost = deals
    .filter((d: any) => d.stage === "LOST")
    .slice(0, 5)
    .map((d: any) => `  - "${d.name}" (${d.company?.name || "no company"}) — ${(d.valueAmount || 0).toLocaleString()} ${d.currency || "AZN"}`)
    .join("\n")

  const prompt = `You are Da Vinci, an AI sales pipeline analyst for an IT outsourcing company CRM.

${langCfg.instruction}

Here is the current sales pipeline data:

Total deals: ${deals.length}
Total pipeline value: ${totalValue.toLocaleString()}
Win rate: ${winRate}%
Won value: ${wonValue.toLocaleString()}
Lost deals: ${lostCount}

Stage breakdown:
${stageLines}

Top 10 deals by value:
${topDeals || "  (none)"}

Recently lost deals:
${recentLost || "  (none)"}

Provide a comprehensive sales pipeline analysis (300-500 words) with:
1. Executive Summary — overall pipeline health assessment
2. Key Metrics — win rate, conversion, average deal size
3. Risk Analysis — stalled deals, concentration risk, deals at risk
4. Opportunities — highest-potential deals, quick wins
5. Recommendations — 3-5 specific actionable steps to improve pipeline

Use professional CRM analyst style with data-driven insights. Be specific about deal names and numbers.`

  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    })

    const analysis = msg.content[0].type === "text" ? msg.content[0].text : ""
    return NextResponse.json({ success: true, data: { analysis } })
  } catch (e: any) {
    console.error("Da Vinci deals analysis error:", e)
    return NextResponse.json({ error: "Da Vinci service unavailable" }, { status: 503 })
  }
}
