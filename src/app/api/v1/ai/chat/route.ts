import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"
import { CRM_TOOLS, TOOL_META, getEnabledTools, getEnabledToolsForAgent } from "@/lib/ai/tools"
import { executeTool } from "@/lib/ai/tool-executor"
import { predictDealWin } from "@/lib/ai/predictive"
import { generateNextBestActions } from "@/lib/ai/next-best-action"
import { routeToAgent } from "@/lib/ai/agent-router"
import { PiiMasker } from "@/lib/ai/pii-masker"

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

const MAX_TOOL_ROUNDS = 5

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { orgId, userId } = session

  const aiLimitKey = `ai:${orgId}`
  if (!checkRateLimit(aiLimitKey, RATE_LIMIT_CONFIG.ai)) {
    return NextResponse.json({ error: "Too many Da Vinci requests. Please try again later." }, { status: 429 })
  }

  const { message, context, history, locale, previousAgentId, sessionId } = await req.json()
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const client = getClient()
  if (!client) return NextResponse.json({ error: "Da Vinci AI requires configuration. Please set ANTHROPIC_API_KEY in Settings → Integrations." }, { status: 503 })

  try {
    // Gather CRM context
    const [dealCount, companyCount, ticketCount, leadCount] = await Promise.all([
      prisma.deal.count({ where: { organizationId: orgId } }),
      prisma.company.count({ where: { organizationId: orgId } }),
      prisma.ticket.count({ where: { organizationId: orgId } }),
      prisma.lead.count({ where: { organizationId: orgId } }),
    ])

    // Get pipeline summary
    const deals = await prisma.deal.findMany({
      where: { organizationId: orgId },
      select: { stage: true, valueAmount: true, currency: true, name: true, probability: true },
    })
    const pipelineByStage: Record<string, { count: number; value: number }> = {}
    for (const d of deals) {
      if (!pipelineByStage[d.stage]) pipelineByStage[d.stage] = { count: 0, value: 0 }
      pipelineByStage[d.stage].count++
      pipelineByStage[d.stage].value += d.valueAmount
    }

    // Open tickets
    const openTickets = await prisma.ticket.count({
      where: { organizationId: orgId, status: { in: ["new", "in_progress", "waiting"] } },
    })

    const langMap: Record<string, string> = {
      az: "Azerbaijani (Azərbaycan dili)",
      ru: "Russian (Русский)",
      en: "English",
    }
    const forceLang = langMap[locale || "ru"] || "Russian"

    // Multi-agent routing: classify intent and find best agent
    const { agent: agentConfig, intent, confidence, isHandoff } = await routeToAgent(
      orgId, message, previousAgentId
    )

    // Record handoff if agent changed
    if (isHandoff && previousAgentId && agentConfig) {
      try {
        await prisma.agentHandoff.create({
          data: {
            organizationId: orgId,
            sessionId: sessionId ?? crypto.randomUUID(),
            fromAgentId: previousAgentId,
            toAgentId: agentConfig.id,
            reason: `Intent: ${intent} (confidence: ${confidence})`,
            context: { lastMessages: (history || []).slice(-3) },
          },
        })
      } catch { /* ignore handoff logging errors */ }
    }

    // Get tools filtered by agent type
    const tools = agentConfig ? getEnabledToolsForAgent(agentConfig) : getEnabledTools([])

    // Context enrichment: deal prediction + next actions when on deal page
    let aiInsightsContext = ""
    const dealPageMatch = context?.url?.match(/\/deals\/([^/]+)/)
    if (dealPageMatch) {
      try {
        const [prediction, nextActions] = await Promise.all([
          predictDealWin(dealPageMatch[1], orgId),
          generateNextBestActions(orgId, userId, 3),
        ])
        aiInsightsContext = `\n\nAI Insights for current deal:
- Win Probability: ${prediction.winProbability}% (confidence: ${prediction.confidence}%)
- Risk Factors: ${prediction.riskFactors.join(", ") || "none"}
- Recommended Actions: ${nextActions.map(a => a.title).join("; ") || "none"}`
      } catch { /* ignore enrichment errors */ }
    }

    const agentName = agentConfig?.configName || "Da Vinci"
    const agentSystemPrompt = agentConfig?.systemPrompt ? `${agentConfig.systemPrompt}\n\n` : ""
    const systemPrompt = `${agentSystemPrompt}You are ${agentName} — an intelligent CRM assistant (type: ${agentConfig?.agentType || "general"}) for LeadDrive Inc., a European CRM platform built by Ukrainian engineers.

CRITICAL RULE #1: You MUST always respond in ${forceLang}. This is non-negotiable regardless of what language the user writes in.

CRM Data Summary:
- Companies: ${companyCount}
- Deals: ${dealCount} (Pipeline: ${JSON.stringify(pipelineByStage)})
- Open Tickets: ${openTickets}
- Leads: ${leadCount}

Current page: ${context?.url || "unknown"} (${context?.title || ""})

Rules:
- ALWAYS respond in ${forceLang}
- Be concise and actionable
- Reference specific data when possible
- If asked about specific records, explain that you see aggregate data
- Format numbers with locale formatting
- You have CRM tools available. Use them when the user asks to create tasks, log activities, update deals, etc.
- For high-risk actions (sending emails, updating contacts), inform the user that approval will be required
- Always confirm what you did after executing a tool
- Use AI insights context below to proactively suggest relevant actions${aiInsightsContext}`

    const messages: Anthropic.MessageParam[] = [
      ...(history || []).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ]

    const start = Date.now()
    let totalInputTokens = 0
    let totalOutputTokens = 0
    const allActions: any[] = []
    let textReply = ""
    const toolsCalled: string[] = []

    // PII masking — load known names from CRM, mask messages + system prompt
    const piiMasker = new PiiMasker()
    try {
      const contacts = await prisma.contact.findMany({
        where: { organizationId: orgId },
        select: { fullName: true },
        take: 200,
      })
      const companies = await prisma.company.findMany({
        where: { organizationId: orgId },
        select: { name: true },
        take: 100,
      })
      piiMasker.addKnownNames(contacts.map((c: any) => c.fullName).filter(Boolean))
      piiMasker.addKnownCompanies(companies.map((c: any) => c.name).filter(Boolean))
    } catch { /* non-critical */ }

    const maskedSystemPrompt = piiMasker.mask(systemPrompt)
    let currentMessages = messages.map((m: any) => ({
      ...m,
      content: typeof m.content === "string" ? piiMasker.mask(m.content) : m.content,
    }))
    const maxRounds = agentConfig?.maxToolRounds || MAX_TOOL_ROUNDS
    for (let round = 0; round < maxRounds; round++) {
      const response = await client.messages.create({
        model: agentConfig?.model || "claude-sonnet-4-20250514",
        max_tokens: agentConfig?.maxTokens || 1024,
        system: maskedSystemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        messages: currentMessages,
      })

      totalInputTokens += response.usage?.input_tokens || 0
      totalOutputTokens += response.usage?.output_tokens || 0

      // Collect text blocks
      for (const block of response.content) {
        if (block.type === "text") {
          textReply += block.text
        }
      }

      // Check for tool_use blocks
      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")

      if (toolUseBlocks.length === 0) {
        // No more tool calls, done
        break
      }

      // Execute tools and build tool_result messages
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolBlock of toolUseBlocks) {
        const meta = TOOL_META[toolBlock.name]
        toolsCalled.push(toolBlock.name)

        const result = await executeTool(
          toolBlock.name,
          toolBlock.input as Record<string, any>,
          orgId,
          userId,
        )

        if (result.requiresApproval) {
          allActions.push({
            tool: toolBlock.name,
            input: toolBlock.input,
            status: "pending_approval",
            pendingActionId: result.pendingActionId,
            riskLevel: meta?.riskLevel || "high",
          })
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: `Action "${toolBlock.name}" requires user approval. A pending action has been created. Tell the user they need to approve this action.`,
          })
        } else if (result.success) {
          allActions.push({
            tool: toolBlock.name,
            input: toolBlock.input,
            status: "executed",
            result: result.data,
            riskLevel: meta?.riskLevel || "low",
          })
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: piiMasker.mask(JSON.stringify({ success: true, ...result.data })),
          })
        } else {
          allActions.push({
            tool: toolBlock.name,
            input: toolBlock.input,
            status: "failed",
            error: result.error,
            riskLevel: meta?.riskLevel || "low",
          })
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: piiMasker.mask(JSON.stringify({ success: false, error: result.error })),
            is_error: true,
          })
        }
      }

      // Add assistant response and tool results for next round
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const, content: toolResults },
      ]

      // Reset text for final reply (we want Claude's summary after tool use)
      if (round < MAX_TOOL_ROUNDS - 1) {
        textReply = ""
      }
    }

    const latency = Date.now() - start

    if (!textReply) {
      textReply = "Action completed."
    }

    // PII unmask — restore original values in AI response
    textReply = piiMasker.unmask(textReply)

    // Log interaction
    try {
      await prisma.aiInteractionLog.create({
        data: {
          organizationId: orgId,
          userMessage: message.slice(0, 500),
          aiResponse: textReply.slice(0, 1000),
          model: agentConfig?.model || "claude-sonnet-4-20250514",
          latencyMs: latency,
          promptTokens: totalInputTokens,
          completionTokens: totalOutputTokens,
          costUsd: (totalInputTokens * 0.003 + totalOutputTokens * 0.015) / 1000,
          toolsCalled,
          agentConfigId: agentConfig?.id,
          agentType: agentConfig?.agentType,
        },
      })
    } catch (err) { console.error(err) }

    return NextResponse.json({
      success: true,
      data: {
        reply: textReply,
        actions: allActions.length > 0 ? allActions : undefined,
        agentId: agentConfig?.id,
        agentName: agentConfig?.configName,
        agentType: agentConfig?.agentType,
        intent,
      },
    })
  } catch (e) {
    console.error("Da Vinci chat error:", e)
    return NextResponse.json({ error: "Da Vinci request failed" }, { status: 500 })
  }
}
