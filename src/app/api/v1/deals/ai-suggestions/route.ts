import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { checkAiBudget, calculateAiCost } from "@/lib/ai/budget"
import { prisma } from "@/lib/prisma"
import { predictDealWin } from "@/lib/ai/predictive"
import Anthropic from "@anthropic-ai/sdk"
import { PiiMasker } from "@/lib/ai/pii-masker"

/**
 * AI Deal Suggestions (Copilot mode)
 * GET ?dealId=xxx → 2-3 actionable suggestions based on deal context
 * Used in <AiSuggestions> component on deal detail page.
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dealId = new URL(req.url).searchParams.get("dealId")
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 })

  const budget = await checkAiBudget(orgId)
  if (!budget.allowed) {
    return NextResponse.json({ error: "Daily AI budget exceeded" }, { status: 429 })
  }

  try {
    // Gather deal context
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId: orgId },
      include: {
        company: { select: { name: true } },
        contact: { select: { fullName: true, email: true } },
      },
    })
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    // Get prediction (graceful degradation if fails)
    let prediction: any = { winProbability: 0, expectedCloseDate: null, riskFactors: [], positiveFactors: [], confidence: 0 }
    try { prediction = await predictDealWin(dealId, orgId) } catch {}

    // Get recent activities
    const activities = await prisma.activity.findMany({
      where: { organizationId: orgId, relatedType: "deal", relatedId: dealId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { type: true, subject: true, createdAt: true },
    })

    // Get recent notes (activity type=note for this deal)
    const notes = await prisma.activity.findMany({
      where: { organizationId: orgId, relatedType: "deal", relatedId: dealId, type: "note" },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { description: true, createdAt: true },
    })

    // Count total tasks for this deal
    const taskCount = await prisma.task.count({
      where: { organizationId: orgId, relatedType: "deal", relatedId: dealId, status: { in: ["pending", "in_progress"] } },
    })

    const daysSinceLastActivity = activities[0]
      ? Math.floor((Date.now() - activities[0].createdAt.getTime()) / 86400000)
      : 999

    const dealAge = Math.floor((Date.now() - deal.createdAt.getTime()) / 86400000)

    // Build context for AI
    const context = {
      deal: {
        name: deal.name,
        stage: deal.stage,
        value: deal.valueAmount,
        probability: deal.probability,
        company: (deal.company as any)?.name,
        contact: (deal.contact as any)?.fullName,
        dealAgeDays: dealAge,
        daysSinceLastActivity,
        openTasks: taskCount,
      },
      prediction: {
        winProbability: prediction.winProbability,
        riskFactors: prediction.riskFactors.map((f: any) => f.key),
        positiveFactors: prediction.positiveFactors.map((f: any) => f.key),
      },
      recentActivities: activities.map((a: any) => ({ type: a.type, subject: a.subject })),
      recentNotes: notes.map((n: any) => n.description?.slice(0, 100)),
    }

    const piiMasker = new PiiMasker()
    const maskedContext = piiMasker.mask(JSON.stringify(context))

    const anthropic = new Anthropic()
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are a CRM sales advisor. Based on this deal context, suggest 2-3 specific, actionable next steps. Return ONLY a JSON array of objects with fields: {"action": string, "reason": string, "priority": "high"|"medium"|"low", "type": "call"|"email"|"meeting"|"task"|"update_stage"}

Context:
${maskedContext}`,
        },
      ],
    })

    const text = piiMasker.unmask(response.content[0]?.type === "text" ? response.content[0].text : "")

    // Parse JSON array from response
    let suggestions: any[] = []
    const arrayMatch = text.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      try {
        suggestions = JSON.parse(arrayMatch[0]).slice(0, 3)
      } catch {
        // fallback to empty
      }
    }

    // Log interaction
    const inputTokens = response.usage?.input_tokens || 0
    const outputTokens = response.usage?.output_tokens || 0
    const cost = calculateAiCost("claude-haiku-4-5-20251001", inputTokens, outputTokens)

    await prisma.aiInteractionLog.create({
      data: {
        organizationId: orgId,
        userMessage: `deal_suggestions:${dealId}`,
        aiResponse: JSON.stringify(suggestions).slice(0, 1000),
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        costUsd: cost,
        model: "claude-haiku-4-5-20251001",
        agentType: "deal_advisor",
        isCopilot: true,
      },
    })

    return NextResponse.json({
      data: {
        suggestions,
        prediction: {
          winProbability: prediction.winProbability,
          confidence: prediction.confidence,
          riskFactors: prediction.riskFactors,
          positiveFactors: prediction.positiveFactors,
        },
      },
    })
  } catch (err: any) {
    console.error("AI deal suggestions error:", err)
    return NextResponse.json({ error: "AI suggestions failed" }, { status: 500 })
  }
}
