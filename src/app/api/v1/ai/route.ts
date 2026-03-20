import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

// Unified AI endpoint for lead-related AI features
// POST /api/v1/ai?action=sentiment|tasks|text

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

async function logAiCall(
  orgId: string,
  userMessage: string,
  aiResponse: string,
  latencyMs: number,
  model: string,
  usage?: { input_tokens: number; output_tokens: number },
) {
  try {
    const promptTokens = usage?.input_tokens || 0
    const completionTokens = usage?.output_tokens || 0
    const costUsd = (promptTokens * 0.00025 + completionTokens * 0.00125) / 1000
    await prisma.aiInteractionLog.create({
      data: {
        organizationId: orgId,
        userMessage: userMessage.slice(0, 500),
        aiResponse: aiResponse.slice(0, 1000),
        latencyMs,
        promptTokens,
        completionTokens,
        costUsd,
        model,
        isCopilot: true,
      },
    })
  } catch {}
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { action, companyId, leadId, options } = body

  if (!action || (!companyId && !leadId)) {
    return NextResponse.json({ error: "action and (companyId or leadId) required" }, { status: 400 })
  }

  try {
    // Build context from either company or lead
    let contextName = ""
    let contactNames = ""
    let dealInfo = ""
    let activitiesList: any[] = []
    let industry = ""
    let website = ""
    let leadStatus = ""
    let userCount = 0
    let mainContactName = "Уважаемый клиент"
    let mainContactPhone = "+994 XX XXX XXXX"
    let mainContactEmail = ""

    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: orgId },
      })
      if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })

      contextName = lead.companyName || lead.contactName
      mainContactName = lead.contactName
      mainContactPhone = lead.phone || "+994 XX XXX XXXX"
      mainContactEmail = lead.email || ""
      contactNames = lead.contactName
      leadStatus = lead.status
      activitiesList = await prisma.activity.findMany({
        where: { organizationId: orgId, relatedType: "lead", relatedId: leadId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => [])
    } else {
      const company = await prisma.company.findFirst({
        where: { id: companyId, organizationId: orgId },
        include: {
          contacts: { take: 5 },
          deals: { take: 5 },
          activities: { take: 10, orderBy: { createdAt: "desc" } },
        },
      })
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

      contextName = company.name
      contactNames = company.contacts.map(c => c.fullName).join(", ")
      dealInfo = company.deals.map(d => `${d.title} (${d.stage}, ${d.valueAmount}₼)`).join("; ")
      activitiesList = company.activities
      industry = company.industry || ""
      website = company.website || ""
      leadStatus = company.leadStatus || ""
      userCount = company.userCount
      const mainContact = company.contacts[0]
      if (mainContact) {
        mainContactName = mainContact.fullName
        mainContactPhone = mainContact.phone || "+994 XX XXX XXXX"
        mainContactEmail = mainContact.email || ""
      }
    }

    const contextBlock = [
      `Компания/Лид: ${contextName}`,
      contactNames ? `Контакты: ${contactNames}` : "",
      dealInfo ? `Сделки: ${dealInfo}` : "Нет активных сделок",
      industry ? `Отрасль: ${industry}` : "",
      website ? `Сайт: ${website}` : "",
      leadStatus ? `Статус: ${leadStatus}` : "",
      userCount > 0 ? `Количество пользователей: ${userCount}` : "",
      mainContactEmail ? `Email: ${mainContactEmail}` : "",
      mainContactPhone ? `Телефон: ${mainContactPhone}` : "",
      activitiesList.length > 0
        ? `Последние активности (${activitiesList.length}):\n${activitiesList.map((a: any) => `- ${a.type}: ${a.subject || a.description || "без темы"} (${new Date(a.createdAt).toLocaleDateString("ru")})`).join("\n")}`
        : "Нет истории активностей",
    ].filter(Boolean).join("\n")

    switch (action) {
      case "sentiment":
        return handleSentiment(orgId, contextBlock, contextName, contactNames, activitiesList)

      case "tasks":
        return handleTasks(orgId, contextBlock, contextName, mainContactName, mainContactPhone, mainContactEmail, industry, website)

      case "text":
        return handleText(orgId, contextBlock, contextName, mainContactName, industry, options)

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── SENTIMENT ──────────────────────────────────────────────

async function handleSentiment(orgId: string, contextBlock: string, contextName: string, contactNames: string, activities: any[]) {
  const client = getClient()
  if (!client) return sentimentFallback(contextName, contactNames, activities)

  try {
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      temperature: 0.3,
      system: `Ты — AI-аналитик CRM-системы LeadDrive. Анализируй данные о клиенте и дай оценку тональности взаимоотношений. Отвечай ТОЛЬКО валидным JSON без markdown.`,
      messages: [{
        role: "user",
        content: `Проанализируй тональность взаимоотношений с клиентом на основе данных:\n\n${contextBlock}\n\nОтветь JSON:\n{"score": число 0-100, "sentiment": "POSITIVE"|"NEUTRAL"|"NEGATIVE", "emoji": "😊"|"😐"|"😟", "trend": "improving"|"stable"|"declining"|"unknown", "risk": "LOW"|"MEDIUM"|"HIGH", "confidence": число 0-100, "summary": "подробный анализ на русском языке (2-3 предложения)"}`,
      }],
    })

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    const data = JSON.parse(text)
    await logAiCall(orgId, `[sentiment] ${contextName}`, text.slice(0, 500), Date.now() - t0, "claude-haiku-4-5-20251001", response.usage)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Claude sentiment error:", error)
    return sentimentFallback(contextName, contactNames, activities)
  }
}

function sentimentFallback(contextName: string, contactNames: string, activities: any[]) {
  const score = activities.length > 0 ? Math.min(90, 30 + activities.length * 10) : 50
  const sentiment = score >= 70 ? "POSITIVE" : score >= 40 ? "NEUTRAL" : "NEGATIVE"
  const emoji = score >= 70 ? "😊" : score >= 40 ? "😐" : "😟"
  const trend = activities.length > 3 ? "improving" : activities.length > 0 ? "stable" : "unknown"
  const risk = score >= 70 ? "LOW" : score >= 40 ? "MEDIUM" : "HIGH"
  const confidence = Math.min(95, activities.length * 15 + 10)
  const summary = activities.length > 0
    ? `Анализ ${activities.length} взаимодействий с ${contextName} показывает ${sentiment.toLowerCase()} тональность. Контакты: ${contactNames || "не указаны"}.`
    : `Недостаточно данных для анализа взаимодействия с ${contextName}. Рекомендуется начать коммуникацию.`
  return NextResponse.json({ success: true, data: { score, sentiment, emoji, trend, risk, confidence, summary } })
}

// ── TASKS ──────────────────────────────────────────────────

async function handleTasks(orgId: string, contextBlock: string, contextName: string, contactName: string, contactPhone: string, contactEmail: string, industry: string, website: string) {
  const client = getClient()
  if (!client) return tasksFallback(contextName, contactName, contactPhone, industry, website)

  try {
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      temperature: 0.5,
      system: `Ты — AI-ассистент CRM-системы LeadDrive. Генерируй умные задачи для менеджеров по продажам. Учитывай контекст клиента. Отвечай ТОЛЬКО валидным JSON без markdown.`,
      messages: [{
        role: "user",
        content: `На основе данных о клиенте сгенерируй 4 задачи для менеджера:\n\n${contextBlock}\n\nОтветь JSON:\n{"strategy": "краткое описание стратегии работы с клиентом (1-2 предложения)", "tasks": [{"title": "заголовок", "description": "подробное описание", "priority": "HIGH"|"MEDIUM"|"LOW", "type": "email"|"call"|"meeting"|"general", "dueDate": "YYYY-MM-DD", "reasoning": "почему эта задача важна"}]}\n\nДаты должны начинаться с ${new Date().toISOString().split("T")[0]}. Все тексты на русском.`,
      }],
    })

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    const data = JSON.parse(text)
    await logAiCall(orgId, `[tasks] ${contextName}`, text.slice(0, 500), Date.now() - t0, "claude-haiku-4-5-20251001", response.usage)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Claude tasks error:", error)
    return tasksFallback(contextName, contactName, contactPhone, industry, website)
  }
}

function tasksFallback(contextName: string, contactName: string, contactPhone: string, industry: string, website: string) {
  const now = new Date()
  const tasks = [
    {
      title: `Первоначальный контакт с ${contactName}`,
      description: `Отправить приветственное письмо ${contactName} с представлением компании${industry ? ` в сфере ${industry}` : ""}.`,
      priority: "HIGH", type: "email",
      dueDate: new Date(now.getTime() + 1 * 86400000).toISOString().split("T")[0],
      reasoning: `Необходимо установить первоначальный контакт.`,
    },
    {
      title: `Исследование компании ${contextName}`,
      description: `Провести анализ потребностей ${contextName}${website ? ` (${website})` : ""} в области IT-услуг.`,
      priority: "MEDIUM", type: "general",
      dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split("T")[0],
      reasoning: `Понимание бизнеса клиента позволит подготовить предложение.`,
    },
    {
      title: `Телефонный звонок ${contactName}`,
      description: `Позвонить по номеру ${contactPhone} для установления контакта.`,
      priority: "HIGH", type: "call",
      dueDate: new Date(now.getTime() + 5 * 86400000).toISOString().split("T")[0],
      reasoning: `Прямой контакт ускорит процесс.`,
    },
    {
      title: `Запланировать встречу или демонстрацию`,
      description: `Предложить встречу или демонстрацию решений для ${contextName}.`,
      priority: "MEDIUM", type: "meeting",
      dueDate: new Date(now.getTime() + 12 * 86400000).toISOString().split("T")[0],
      reasoning: `Встреча увеличит вероятность сделки.`,
    },
  ]
  const strategy = `Стратегия: многоканальный подход к ${contactName} из ${contextName} — email, исследование, звонок, встреча.`
  return NextResponse.json({ success: true, data: { strategy, tasks } })
}

// ── TEXT GENERATION ────────────────────────────────────────

async function handleText(orgId: string, contextBlock: string, contextName: string, contactName: string, industry: string, options: any) {
  const textType = options?.textType || "Email"
  const tone = options?.tone || "Профессиональный"
  const instructions = options?.instructions || ""

  const client = getClient()
  if (!client) return textFallback(textType, tone, instructions, contextName, contactName, industry)

  try {
    const prompt = textType === "Email"
      ? `Напиши деловое письмо для ${contactName} из ${contextName}.\nТон: ${tone}.\n${instructions ? `Дополнительные инструкции: ${instructions}\n` : ""}\nКонтекст клиента:\n${contextBlock}\n\nОтветь JSON:\n{"subject": "тема письма", "body": "текст письма", "textType": "Email", "tone": "${tone}"}`
      : `Напиши SMS-сообщение для ${contactName} из ${contextName}.\nТон: ${tone}.\n${instructions ? `Инструкции: ${instructions}\n` : ""}\nКонтекст:\n${contextBlock}\n\nОтветь JSON:\n{"subject": "", "body": "текст SMS (до 160 символов)", "textType": "SMS", "tone": "${tone}"}`

    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      temperature: 0.7,
      system: `Ты — AI-копирайтер CRM-системы LeadDrive. Пишешь профессиональные тексты для бизнес-коммуникаций. Отвечай ТОЛЬКО валидным JSON без markdown. Подпись: Güvən Technology LLC.`,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    const data = JSON.parse(text)
    await logAiCall(orgId, `[text-${textType}] ${contextName}`, text.slice(0, 500), Date.now() - t0, "claude-haiku-4-5-20251001", response.usage)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Claude text error:", error)
    return textFallback(textType, tone, instructions, contextName, contactName, industry)
  }
}

function textFallback(textType: string, tone: string, instructions: string, contextName: string, contactName: string, industry: string) {
  let subject = ""
  let emailBody = ""
  if (textType === "Email") {
    subject = "Деловое предложение от нашей компании"
    emailBody = `Уважаемый(ая) ${contactName},\n\nНадеюсь, что это письмо застает вас в добром здравии.\n\nМы с интересом следим за деятельностью ${contextName} и были бы рады установить деловые отношения. Наша компания предоставляет решения${industry ? ` в области ${industry}` : ""}.\n\n${instructions ? `${instructions}\n\n` : ""}С уважением,\nGüvən Technology LLC`
  } else {
    emailBody = `Здравствуйте, ${contactName}! Güvən Technology предлагает сотрудничество${industry ? ` в сфере ${industry}` : ""}. Удобно перезвонить? ${instructions || ""}`
  }
  return NextResponse.json({ success: true, data: { subject, body: emailBody, textType, tone } })
}
