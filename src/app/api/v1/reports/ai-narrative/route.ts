import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { checkAiBudget, calculateAiCost } from "@/lib/ai/budget"
import { prisma } from "@/lib/prisma"
import { generateRevenueForecast } from "@/lib/ai/predictive"
import { calculateChurnRisk } from "@/lib/ai/predictive"
import { PiiMasker } from "@/lib/ai/pii-masker"
import Anthropic from "@anthropic-ai/sdk"

/**
 * AI Revenue Forecast Narrative
 * GET → generates a text commentary on the forecast data
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const budget = await checkAiBudget(orgId)
  if (!budget.allowed) {
    return NextResponse.json({ error: "Daily AI budget exceeded" }, { status: 429 })
  }

  try {
    // Gather data
    const [forecast, churnRisks] = await Promise.all([
      generateRevenueForecast(orgId, 3),
      calculateChurnRisk(orgId),
    ])

    // Pipeline summary
    const pipeline = await prisma.deal.findMany({
      where: { organizationId: orgId, stage: { notIn: ["WON", "LOST"] } },
      select: { stage: true, valueAmount: true, name: true, expectedClose: true },
    })

    const pipelineTotal = pipeline.reduce((s: number, d: any) => s + (d.valueAmount || 0), 0)
    const dealsByStage: Record<string, { count: number; value: number }> = {}
    for (const d of pipeline) {
      if (!dealsByStage[d.stage]) dealsByStage[d.stage] = { count: 0, value: 0 }
      dealsByStage[d.stage].count++
      dealsByStage[d.stage].value += d.valueAmount || 0
    }

    // Recent wins
    const recentWins = await prisma.deal.findMany({
      where: {
        organizationId: orgId,
        stage: "WON",
        updatedAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      select: { name: true, valueAmount: true },
    })
    const wonTotal = recentWins.reduce((s: number, d: any) => s + (d.valueAmount || 0), 0)

    const context = {
      forecast: forecast.slice(-3), // next 3 months
      pipelineTotal,
      pipelineByStage: dealsByStage,
      activeDealCount: pipeline.length,
      recentWins: { count: recentWins.length, total: wonTotal },
      topChurnRisks: churnRisks.slice(0, 3).map((c: any) => ({ company: c.companyName, score: c.riskScore })),
    }

    const anthropic = new Anthropic()
    const piiMasker = new PiiMasker()
    const maskedContext = piiMasker.mask(JSON.stringify(context))
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      messages: [
        {
          role: "user",
          content: `You are a CRM revenue analyst. Write a concise 2-3 sentence forecast commentary based on this data. Focus on: expected revenue, key risks, and one actionable recommendation. No headers, no bullet points — just plain text paragraphs. Keep it under 80 words.\n\nData:\n${maskedContext}`,
        },
      ],
    })

    const text = piiMasker.unmask(response.content[0]?.type === "text" ? response.content[0].text : "")

    // Log
    const inputTokens = response.usage?.input_tokens || 0
    const outputTokens = response.usage?.output_tokens || 0
    await prisma.aiInteractionLog.create({
      data: {
        organizationId: orgId,
        userMessage: "forecast_narrative",
        aiResponse: text.slice(0, 1000),
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        costUsd: calculateAiCost("claude-haiku-4-5-20251001", inputTokens, outputTokens),
        model: "claude-haiku-4-5-20251001",
        agentType: "forecast_analyst",
        isCopilot: true,
      },
    })

    return NextResponse.json({ data: { narrative: text } })
  } catch (err: any) {
    console.error("AI forecast narrative error:", err)
    return NextResponse.json({ error: "Narrative generation failed" }, { status: 500 })
  }
}
