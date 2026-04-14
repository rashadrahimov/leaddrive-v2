import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { checkAiBudget, calculateAiCost } from "@/lib/ai/budget"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

/**
 * AI Ticket Auto-Categorization (Copilot mode)
 * POST { subject, description } → { category, priority, confidence }
 * Used to pre-fill form fields — user always confirms before saving.
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const budget = await checkAiBudget(orgId)
  if (!budget.allowed) {
    return NextResponse.json({ error: "Daily AI budget exceeded" }, { status: 429 })
  }

  const body = await req.json()
  const { subject, description } = body as { subject?: string; description?: string }

  if (!subject && !description) {
    return NextResponse.json({ error: "Subject or description required" }, { status: 400 })
  }

  try {
    const anthropic = new Anthropic()
    const input = `Subject: ${(subject || "").slice(0, 200)}\nDescription: ${(description || "").slice(0, 500)}`

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Classify this support ticket. Return ONLY valid JSON with exactly these fields:
{"category": "general"|"technical"|"billing"|"feature_request", "priority": "low"|"medium"|"high"|"critical", "confidence": 0.0-1.0}

Ticket:
${input}`,
        },
      ],
    })

    const text = response.content[0]?.type === "text" ? response.content[0].text : ""

    // Parse JSON from response
    const jsonMatch = text.match(/\{[^}]+\}/)
    let result = { category: "general", priority: "medium", confidence: 0.5 }

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        const validCategories = ["general", "technical", "billing", "feature_request"]
        const validPriorities = ["low", "medium", "high", "critical"]

        result = {
          category: validCategories.includes(parsed.category) ? parsed.category : "general",
          priority: validPriorities.includes(parsed.priority) ? parsed.priority : "medium",
          confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
        }
      } catch {
        // Use defaults
      }
    }

    // Log the interaction
    const inputTokens = response.usage?.input_tokens || 0
    const outputTokens = response.usage?.output_tokens || 0
    const cost = calculateAiCost("claude-haiku-4-5-20251001", inputTokens, outputTokens)

    await prisma.aiInteractionLog.create({
      data: {
        organizationId: orgId,
        userMessage: `categorize: ${(subject || "").slice(0, 100)}`,
        aiResponse: JSON.stringify(result),
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        costUsd: cost,
        model: "claude-haiku-4-5-20251001",
        agentType: "ticket_categorizer",
        isCopilot: true,
      },
    })

    return NextResponse.json({ data: result })
  } catch (err: any) {
    console.error("AI ticket categorization error:", err)
    return NextResponse.json({ error: "AI classification failed" }, { status: 500 })
  }
}
