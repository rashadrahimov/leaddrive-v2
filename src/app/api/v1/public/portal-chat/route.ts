import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"
import Anthropic from "@anthropic-ai/sdk"

const DEFAULT_SYSTEM_PROMPT = `Sen LeadDrive CRM-in texniki dəstək agentisən. Sənin adındır "LeadDrive Support Pro".

QAYDALAR:
1. Müştərilərə Azərbaycan, Rus və ya İngilis dilində cavab ver — hansı dildə yazırlarsa, o dildə cavab ver.
2. Əgər KB konteksti varsa ({kb_context}), ilk növbədə oradakı məlumatdan istifadə et.
3. Hər zaman nəzakətli, professional və qısa cavablar ver.
4. Müştəri narazıdırsa, empatiya göstər və problemin həllinə fokuslan.
5. Əgər sual sənin səlahiyyətindən kənardırsa, müştərini dəstək tiketinə yönləndir.
6. SLA vaxtlarına diqqət et: Kritik - 4 saat, Yüksək - 8 saat, Orta - 24 saat, Aşağı - 72 saat.
7. Qiymətlər barədə danışmaq olmaz — menecerə yönləndir.
8. Texniki suallar üçün dəqiq, addım-addım izahatlar ver.`

async function getActiveAgentConfig(organizationId: string) {
  return prisma.aiAgentConfig.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { updatedAt: "desc" },
  })
}

async function getGuardrails(organizationId: string): Promise<string[]> {
  const guardrails = await prisma.aiGuardrail.findMany({
    where: { organizationId, isActive: true },
  })
  return guardrails
    .filter(g => g.promptInjection)
    .map(g => g.promptInjection!)
}

async function getKbContext(organizationId: string, query: string, maxArticles: number = 5): Promise<string> {
  try {
    const articles = await prisma.kbArticle.findMany({
      where: {
        organizationId,
        status: "published",
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      take: maxArticles,
      select: { title: true, content: true },
    })
    if (articles.length === 0) return "Bilik bazasında uyğun məqalə tapılmadı."
    return articles.map(a => `## ${a.title}\n${a.content?.slice(0, 500) || ""}`).join("\n\n")
  } catch {
    return "Bilik bazası əlçatan deyil."
  }
}

async function getChatHistory(sessionId: string, maxMessages: number = 20): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await prisma.aiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: maxMessages,
    select: { role: true, content: true },
  })
  return messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
}

async function logInteraction(
  organizationId: string,
  sessionId: string,
  userMessage: string,
  aiResponse: string,
  latencyMs: number,
  model: string,
  usage?: { input_tokens: number; output_tokens: number },
  kbArticlesUsed: string[] = [],
) {
  const promptTokens = usage?.input_tokens || 0
  const completionTokens = usage?.output_tokens || 0
  // Rough cost estimate (Sonnet pricing ~$3/M input, ~$15/M output)
  const costUsd = (promptTokens * 0.003 + completionTokens * 0.015) / 1000

  await prisma.aiInteractionLog.create({
    data: {
      organizationId,
      sessionId,
      userMessage: userMessage.slice(0, 500),
      aiResponse: aiResponse.slice(0, 1000),
      latencyMs,
      promptTokens,
      completionTokens,
      costUsd,
      model,
      kbArticlesUsed,
    },
  })

  // Check for anomalies and generate alerts
  await checkAndCreateAlerts(organizationId, sessionId, latencyMs, promptTokens + completionTokens)
}

async function checkAndCreateAlerts(
  organizationId: string,
  sessionId: string,
  latencyMs: number,
  totalTokens: number,
) {
  // High latency alert (>10 seconds)
  if (latencyMs > 10000) {
    await prisma.aiAlert.create({
      data: {
        organizationId,
        type: "high_latency",
        severity: latencyMs > 20000 ? "critical" : "warning",
        message: `High latency: ${latencyMs.toFixed(0)}ms (${(latencyMs / 1000).toFixed(1)}s)`,
        sessionId,
        metadata: { latency_ms: latencyMs },
      },
    })
  }

  // Token spike alert — compare with recent average
  const recentLogs = await prisma.aiInteractionLog.findMany({
    where: {
      organizationId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { promptTokens: true, completionTokens: true },
    take: 20,
  })

  if (recentLogs.length >= 3) {
    const avgTokens = recentLogs.reduce((sum, l) => sum + (l.promptTokens || 0) + (l.completionTokens || 0), 0) / recentLogs.length
    if (totalTokens > avgTokens * 3 && totalTokens > 2000) {
      await prisma.aiAlert.create({
        data: {
          organizationId,
          type: "token_spike",
          severity: "warning",
          message: `Token spike: ${totalTokens} tokens (avg: ${Math.round(avgTokens)})`,
          sessionId,
          metadata: { tokens: totalTokens, avg_24h: Math.round(avgTokens) },
        },
      })
    }
  }
}

export async function POST(req: NextRequest) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { message, sessionId } = await req.json()
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 })

  let session: { id: string; messagesCount: number }

  if (sessionId) {
    const existing = await prisma.aiChatSession.findFirst({
      where: {
        id: sessionId,
        organizationId: user.organizationId,
        portalUserId: user.contactId,
      },
    })
    if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 })
    session = existing
  } else {
    session = await prisma.aiChatSession.create({
      data: {
        organizationId: user.organizationId,
        portalUserId: user.contactId,
        companyId: user.companyId,
        status: "active",
      },
    })
  }

  // Save user message
  await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: message,
    },
  })

  let assistantContent: string

  if (process.env.ANTHROPIC_API_KEY) {
    const startTime = Date.now()
    let usedModel = "claude-haiku-4-5-20251001"
    let usage: { input_tokens: number; output_tokens: number } | undefined

    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      // Load active agent config from DB
      const agentConfig = await getActiveAgentConfig(user.organizationId)

      // Load guardrails from DB
      const guardrailPrompts = await getGuardrails(user.organizationId)

      // Determine model and parameters from config or defaults
      const model = agentConfig?.model || "claude-haiku-4-5-20251001"
      const maxTokens = agentConfig?.maxTokens || 2048
      const temperature = agentConfig?.temperature ?? 0.7
      const kbMaxArticles = agentConfig?.kbMaxArticles || 5
      const kbEnabled = agentConfig?.kbEnabled ?? true
      usedModel = model

      // Get KB context and chat history
      const [kbContext, history] = await Promise.all([
        kbEnabled ? getKbContext(user.organizationId, message, kbMaxArticles) : Promise.resolve(""),
        sessionId ? getChatHistory(session.id) : Promise.resolve([]),
      ])

      // Build system prompt: agent config > default, then inject guardrails
      let systemPrompt = (agentConfig?.systemPrompt || DEFAULT_SYSTEM_PROMPT)
        .replace("{kb_context}", kbContext)
        .replace("{current_date}", new Date().toISOString().split("T")[0])
        .replace("{company_id}", user.companyId || "")

      // Append guardrails
      if (guardrailPrompts.length > 0) {
        systemPrompt += "\n\nQUARANTİYALAR (mütləq riayət et):\n" + guardrailPrompts.map((g, i) => `${i + 1}. ${g}`).join("\n")
      }

      // Append user context
      systemPrompt += `\n\nMüştəri adı: ${user.fullName}\nMüştəri email: ${user.email}\nTarix: ${new Date().toISOString().split("T")[0]}`

      // Build messages array with history
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...history.slice(0, -1),
        { role: "user", content: message },
      ]

      const cleanMessages = messages.filter((m, i) => {
        if (i === 0) return m.role === "user"
        return m.role !== messages[i - 1]?.role
      })

      if (cleanMessages.length === 0 || cleanMessages[0].role !== "user") {
        cleanMessages.unshift({ role: "user", content: message })
      }

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: cleanMessages,
      })

      assistantContent = response.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("")

      usage = response.usage

    } catch (error) {
      console.error("Claude API error:", error)
      assistantContent = getFallbackResponse(message, user.fullName)
    }

    // Log interaction with latency, tokens, cost + generate alerts
    const latencyMs = Date.now() - startTime
    try {
      await logInteraction(
        user.organizationId,
        session.id,
        message,
        assistantContent,
        latencyMs,
        usedModel,
        usage,
      )
    } catch (e) {
      console.error("Failed to log interaction:", e)
    }
  } else {
    assistantContent = getFallbackResponse(message, user.fullName)
  }

  // Save assistant message
  const assistantMessage = await prisma.aiChatMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: assistantContent,
    },
  })

  // Update session message count
  await prisma.aiChatSession.update({
    where: { id: session.id },
    data: { messagesCount: { increment: 2 } },
  })

  // Check if AI suggests creating a ticket
  const suggestTicket = /тикет|ticket|tiket|обратитесь|создайте|sorğu|yarada/i.test(assistantContent)

  return NextResponse.json({
    success: true,
    data: {
      sessionId: session.id,
      reply: {
        id: assistantMessage.id,
        role: "assistant",
        content: assistantContent,
        createdAt: assistantMessage.createdAt,
      },
      suggestTicket,
    },
  })
}

function getFallbackResponse(message: string, userName: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("tiket") || lower.includes("ticket") || lower.includes("тикет")) {
    return `${userName}, tiket yaratmaq üçün "Tiketlər" bölməsinə keçin. Orada yeni dəstək sorğusu aça bilərsiniz. Əgər təcili məsələdirsə, mövzuda "Kritik" prioritetini seçin.`
  }
  if (lower.includes("qiymət") || lower.includes("price") || lower.includes("цена")) {
    return `${userName}, qiymətlər və xüsusi təkliflər barədə məlumat almaq üçün satış menecerimizlə əlaqə saxlayın. Mən bu barədə məlumat verə bilmərəm.`
  }
  if (lower.includes("salam") || lower.includes("hello") || lower.includes("привет")) {
    return `Salam, ${userName}! LeadDrive Support Pro xidmətinizdədir. Sizə necə kömək edə bilərəm?`
  }
  return `Təşəkkür edirəm, ${userName}. Sorğunuzu aldım: "${message.slice(0, 100)}". Daha ətraflı kömək üçün dəstək tiketi yarada bilərsiniz.`
}
