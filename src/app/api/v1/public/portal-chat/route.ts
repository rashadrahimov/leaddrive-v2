import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"
import Anthropic from "@anthropic-ai/sdk"

const SYSTEM_PROMPT = `Sen LeadDrive CRM-in texniki dəstək agentisən. Sənin adındır "LeadDrive Support Pro".

QAYDALAR:
1. Müştərilərə Azərbaycan, Rus və ya İngilis dilində cavab ver — hansı dildə yazırlarsa, o dildə cavab ver.
2. Əgər KB konteksti varsa ({kb_context}), ilk növbədə oradakı məlumatdan istifadə et.
3. Hər zaman nəzakətli, professional və qısa cavablar ver.
4. Müştəri narazıdırsa, empatiya göstər və problemin həllinə fokuslan.
5. Əgər sual sənin səlahiyyətindən kənardırsa, müştərini dəstək tiketinə yönləndir.
6. SLA vaxtlarına diqqət et: Kritik - 4 saat, Yüksək - 8 saat, Orta - 24 saat, Aşağı - 72 saat.
7. Qiymətlər barədə danışmaq olmaz — menecerə yönləndir.
8. Texniki suallar üçün dəqiq, addım-addım izahatlar ver.`

async function getKbContext(organizationId: string, query: string): Promise<string> {
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
      take: 5,
      select: { title: true, content: true },
    })
    if (articles.length === 0) return "Bilik bazasında uyğun məqalə tapılmadı."
    return articles.map(a => `## ${a.title}\n${a.content?.slice(0, 500) || ""}`).join("\n\n")
  } catch {
    return "Bilik bazası əlçatan deyil."
  }
}

async function getChatHistory(sessionId: string): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await prisma.aiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { role: true, content: true },
  })
  return messages
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
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
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      // Get KB context and chat history
      const [kbContext, history] = await Promise.all([
        getKbContext(user.organizationId, message),
        sessionId ? getChatHistory(session.id) : Promise.resolve([]),
      ])

      const systemPrompt = SYSTEM_PROMPT
        .replace("{kb_context}", kbContext)
        + `\n\nМүştəri adı: ${user.fullName}\nМüştəri email: ${user.email}\nTarix: ${new Date().toISOString().split("T")[0]}`

      // Build messages array with history (excluding the just-saved user message which is already in history for existing sessions)
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [
        ...history.slice(0, -1), // exclude the last one (the message we just saved)
        { role: "user", content: message },
      ]

      // Ensure messages alternate properly and start with user
      const cleanMessages = messages.filter((m, i) => {
        if (i === 0) return m.role === "user"
        return m.role !== messages[i - 1]?.role
      })

      if (cleanMessages.length === 0 || cleanMessages[0].role !== "user") {
        cleanMessages.unshift({ role: "user", content: message })
      }

      const response = await client.messages.create({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 2048,
        temperature: 0.7,
        system: systemPrompt,
        messages: cleanMessages,
      })

      assistantContent = response.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("")

    } catch (error) {
      console.error("Claude API error:", error)
      assistantContent = getFallbackResponse(message, user.fullName)
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
