import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const aiLimitKey = `ai:${orgId}`
  if (!checkRateLimit(aiLimitKey, RATE_LIMIT_CONFIG.ai)) {
    return NextResponse.json({ error: "Too many AI requests. Please try again later." }, { status: 429 })
  }

  const { message, context, history, locale } = await req.json()
  if (!message) return NextResponse.json({ error: "Message required" }, { status: 400 })

  const client = getClient()
  if (!client) return NextResponse.json({ error: "AI not configured" }, { status: 503 })

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

    const systemPrompt = `You are LeadDrive AI — an intelligent CRM assistant for Güvən Technology LLC, an IT outsourcing company in Baku, Azerbaijan.

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
- Format numbers with locale formatting`

    const messages: Anthropic.MessageParam[] = [
      ...(history || []).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ]

    const start = Date.now()
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
    const latency = Date.now() - start

    const reply = response.content[0]?.type === "text" ? response.content[0].text : "No response"

    // Log AI interaction
    try {
      await prisma.aiInteractionLog.create({
        data: {
          organizationId: orgId,
          userMessage: message.slice(0, 500),
          aiResponse: reply.slice(0, 1000),
          model: "claude-sonnet-4-20250514",
          latencyMs: latency,
          promptTokens: response.usage?.input_tokens || 0,
          completionTokens: response.usage?.output_tokens || 0,
          costUsd: ((response.usage?.input_tokens || 0) * 0.003 + (response.usage?.output_tokens || 0) * 0.015) / 1000,
        },
      })
    } catch (err) { console.error(err) }

    return NextResponse.json({ success: true, data: { reply } })
  } catch (e) {
    console.error("AI chat error:", e)
    return NextResponse.json({ error: "AI request failed" }, { status: 500 })
  }
}
