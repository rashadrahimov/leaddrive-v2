import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"

// Unified Da Vinci endpoint for lead-related Da Vinci features
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
  } catch (err) { console.error(err) }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const aiLimitKey = `ai:${orgId}`
  if (!checkRateLimit(aiLimitKey, RATE_LIMIT_CONFIG.ai)) {
    return NextResponse.json({ error: "Too many Da Vinci requests. Please try again later." }, { status: 429 })
  }

  const body = await req.json()
  const { action, companyId, leadId, options, locale: reqLocale } = body
  const locale = reqLocale || "ru"
  const langMap: Record<string, string> = { en: "English", ru: "Russian", az: "Azerbaijani" }
  const langName = langMap[locale] || "Russian"

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
          contacts: { where: { organizationId: orgId }, take: 5 },
          deals: { where: { organizationId: orgId }, take: 5 },
          activities: { where: { organizationId: orgId }, take: 10, orderBy: { createdAt: "desc" } },
        },
      })
      if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

      contextName = company.name
      contactNames = company.contacts.map((c: any) => c.fullName).join(", ")
      dealInfo = company.deals.map((d: any) => `${d.name || d.title} (${d.stage}, ${d.valueAmount}₼)`).join("; ")
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
        return handleSentiment(orgId, contextBlock, contextName, contactNames, activitiesList, langName)

      case "tasks":
        return handleTasks(orgId, contextBlock, contextName, mainContactName, mainContactPhone, mainContactEmail, industry, website, langName)

      case "text":
        return handleText(orgId, contextBlock, contextName, mainContactName, industry, options, langName)

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ── SENTIMENT ──────────────────────────────────────────────

async function handleSentiment(orgId: string, contextBlock: string, contextName: string, contactNames: string, activities: any[], langName: string) {
  const client = getClient()
  if (!client) return sentimentFallback(contextName, contactNames, activities)

  try {
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      temperature: 0.3,
      system: `You are an Da Vinci analyst for LeadDrive CRM. Analyze client data and provide a sentiment assessment. Respond ONLY with valid JSON, no markdown. All text content MUST be in ${langName}.`,
      messages: [{
        role: "user",
        content: `Analyze the sentiment of the relationship with the client based on data:\n\n${contextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"score": number 0-100, "sentiment": "POSITIVE"|"NEUTRAL"|"NEGATIVE", "emoji": "😊"|"😐"|"😟", "trend": "improving"|"stable"|"declining"|"unknown", "risk": "LOW"|"MEDIUM"|"HIGH", "confidence": number 0-100, "summary": "detailed analysis in ${langName} (2-3 sentences)"}`,
      }],
    })

    let text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
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

async function handleTasks(orgId: string, contextBlock: string, contextName: string, contactName: string, contactPhone: string, contactEmail: string, industry: string, website: string, langName: string) {
  const client = getClient()
  if (!client) return tasksFallback(contextName, contactName, contactPhone, industry, website, langName)

  try {
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      temperature: 0.5,
      system: `You are an Da Vinci assistant for LeadDrive CRM. Generate smart tasks for sales managers. Consider client context. Respond ONLY with valid JSON, no markdown. All text content MUST be in ${langName}.`,
      messages: [{
        role: "user",
        content: `Based on the client data, generate 4 tasks for the manager:\n\n${contextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"strategy": "brief strategy description (1-2 sentences)", "tasks": [{"title": "title", "description": "detailed description", "priority": "HIGH"|"MEDIUM"|"LOW", "type": "email"|"call"|"meeting"|"general", "dueDate": "YYYY-MM-DD", "reasoning": "why this task is important"}]}\n\nDates should start from ${new Date().toISOString().split("T")[0]}. All text content must be in ${langName}.`,
      }],
    })

    let text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const data = JSON.parse(text)
    await logAiCall(orgId, `[tasks] ${contextName}`, text.slice(0, 500), Date.now() - t0, "claude-haiku-4-5-20251001", response.usage)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Claude tasks error:", error)
    return tasksFallback(contextName, contactName, contactPhone, industry, website, langName)
  }
}

function tasksFallback(contextName: string, contactName: string, contactPhone: string, industry: string, website: string, langName: string) {
  const now = new Date()
  const fb: Record<string, any> = {
    Russian: {
      t1: `Первоначальный контакт с ${contactName}`,
      d1: `Отправить приветственное письмо ${contactName} с представлением компании${industry ? ` в сфере ${industry}` : ""}.`,
      r1: `Необходимо установить первоначальный контакт.`,
      t2: `Исследование компании ${contextName}`,
      d2: `Провести анализ потребностей ${contextName}${website ? ` (${website})` : ""} в области IT-услуг.`,
      r2: `Понимание бизнеса клиента позволит подготовить предложение.`,
      t3: `Телефонный звонок ${contactName}`,
      d3: `Позвонить по номеру ${contactPhone} для установления контакта.`,
      r3: `Прямой контакт ускорит процесс.`,
      t4: `Запланировать встречу или демонстрацию`,
      d4: `Предложить встречу или демонстрацию решений для ${contextName}.`,
      r4: `Встреча увеличит вероятность сделки.`,
      strategy: `Стратегия: многоканальный подход к ${contactName} из ${contextName} — email, исследование, звонок, встреча.`,
    },
    Azerbaijani: {
      t1: `${contactName} ilə ilkin əlaqə`,
      d1: `${contactName}-a şirkətin təqdimatı ilə salamlama məktubu göndərin${industry ? ` ${industry} sahəsində` : ""}.`,
      r1: `İlkin əlaqə qurmaq lazımdır.`,
      t2: `${contextName} şirkətinin araşdırılması`,
      d2: `${contextName}${website ? ` (${website})` : ""} IT xidmətləri sahəsində ehtiyaclarının təhlili.`,
      r2: `Müştərinin biznesini anlamaq təklif hazırlamağa imkan verəcək.`,
      t3: `${contactName}-a telefon zəngi`,
      d3: `Əlaqə qurmaq üçün ${contactPhone} nömrəsinə zəng edin.`,
      r3: `Birbaşa əlaqə prosesi sürətləndirəcək.`,
      t4: `Görüş və ya nümayiş planlaşdırın`,
      d4: `${contextName} üçün həllərin görüşü və ya nümayişi təklif edin.`,
      r4: `Görüş sövdələşmə ehtimalını artıracaq.`,
      strategy: `Strategiya: ${contactName} (${contextName}) ilə çoxkanallı yanaşma — email, araşdırma, zəng, görüş.`,
    },
    English: {
      t1: `Initial contact with ${contactName}`,
      d1: `Send a welcome email to ${contactName} introducing the company${industry ? ` in ${industry}` : ""}.`,
      r1: `Need to establish initial contact.`,
      t2: `Research ${contextName}`,
      d2: `Analyze ${contextName}'s${website ? ` (${website})` : ""} needs in IT services.`,
      r2: `Understanding the client's business will help prepare a proposal.`,
      t3: `Phone call to ${contactName}`,
      d3: `Call ${contactPhone} to establish contact.`,
      r3: `Direct contact will speed up the process.`,
      t4: `Schedule a meeting or demo`,
      d4: `Offer a meeting or solution demo for ${contextName}.`,
      r4: `A meeting will increase the chance of a deal.`,
      strategy: `Strategy: multi-channel approach to ${contactName} from ${contextName} — email, research, call, meeting.`,
    },
  }
  const l = fb[langName] || fb.Russian
  const tasks = [
    { title: l.t1, description: l.d1, priority: "HIGH", type: "email", dueDate: new Date(now.getTime() + 1 * 86400000).toISOString().split("T")[0], reasoning: l.r1 },
    { title: l.t2, description: l.d2, priority: "MEDIUM", type: "general", dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split("T")[0], reasoning: l.r2 },
    { title: l.t3, description: l.d3, priority: "HIGH", type: "call", dueDate: new Date(now.getTime() + 5 * 86400000).toISOString().split("T")[0], reasoning: l.r3 },
    { title: l.t4, description: l.d4, priority: "MEDIUM", type: "meeting", dueDate: new Date(now.getTime() + 12 * 86400000).toISOString().split("T")[0], reasoning: l.r4 },
  ]
  return NextResponse.json({ success: true, data: { strategy: l.strategy, tasks } })
}

// ── TEXT GENERATION ────────────────────────────────────────

async function handleText(orgId: string, contextBlock: string, contextName: string, contactName: string, industry: string, options: any, langName: string) {
  const textType = options?.textType || "Email"
  const tone = options?.tone || "professional"
  const instructions = options?.instructions || ""

  const client = getClient()
  if (!client) return textFallback(textType, tone, instructions, contextName, contactName, industry, langName)

  try {
    const prompt = textType === "Email"
      ? `Write a business email for ${contactName} from ${contextName}.\nTone: ${tone}.\n${instructions ? `IMPORTANT — the user wants you to naturally weave this idea into the email (do NOT copy-paste it literally, rephrase it elegantly and make it part of the message flow): "${instructions}"\n` : ""}\nClient context:\n${contextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"subject": "email subject", "body": "email body", "textType": "Email", "tone": "${tone}"}`
      : `Write an SMS message for ${contactName} from ${contextName}.\nTone: ${tone}.\n${instructions ? `IMPORTANT — naturally include this idea (rephrase elegantly, don't copy literally): "${instructions}"\n` : ""}\nContext:\n${contextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"subject": "", "body": "SMS text (up to 160 chars)", "textType": "SMS", "tone": "${tone}"}`

    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      temperature: 0.7,
      system: `You are an Da Vinci copywriter for LeadDrive CRM. Write professional texts for business communications. Respond ONLY with valid JSON, no markdown. Signature: Güvən Technology LLC. All text content MUST be in ${langName}.`,
      messages: [{ role: "user", content: prompt }],
    })

    let text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    // Strip markdown code fences if Claude wraps response in ```json ... ```
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const data = JSON.parse(text)
    await logAiCall(orgId, `[text-${textType}] ${contextName}`, text.slice(0, 500), Date.now() - t0, "claude-haiku-4-5-20251001", response.usage)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Claude text error:", error)
    return textFallback(textType, tone, instructions, contextName, contactName, industry, langName)
  }
}

function textFallback(textType: string, tone: string, instructions: string, contextName: string, contactName: string, industry: string, langName: string) {
  const fb: Record<string, { subject: string; body: string; sms: string }> = {
    Russian: {
      subject: "Деловое предложение от нашей компании",
      body: `Уважаемый(ая) ${contactName},\n\nНадеюсь, что это письмо застает вас в добром здравии.\n\nМы с интересом следим за деятельностью ${contextName} и были бы рады установить деловые отношения. Наша компания предоставляет решения${industry ? ` в области ${industry}` : ""}.${instructions ? `\n\nТакже хотим отметить: ${instructions}.` : ""}\n\nС уважением,\nGüvən Technology LLC`,
      sms: `Здравствуйте, ${contactName}! Güvən Technology предлагает сотрудничество${industry ? ` в сфере ${industry}` : ""}. Удобно перезвонить? ${instructions || ""}`,
    },
    Azerbaijani: {
      subject: "Şirkətimizdən işgüzar təklif",
      body: `Hörmətli ${contactName},\n\nÜmid edirik ki, bu məktub sizi yaxşı vəziyyətdə tapır.\n\n${contextName} şirkətinin fəaliyyətini maraqla izləyirik və işgüzar əlaqələr qurmaqdan məmnun olarıq. Şirkətimiz ${industry ? `${industry} sahəsində ` : ""}həllər təqdim edir.${instructions ? `\n\nHəmçinin qeyd etmək istərdik: ${instructions}.` : ""}\n\nHörmətlə,\nGüvən Technology LLC`,
      sms: `Salam, ${contactName}! Güvən Technology ${industry ? `${industry} sahəsində ` : ""}əməkdaşlıq təklif edir. Geri zəng etmək münasibdir? ${instructions || ""}`,
    },
    English: {
      subject: "Business proposal from our company",
      body: `Dear ${contactName},\n\nI hope this email finds you well.\n\nWe have been following ${contextName}'s activities with great interest and would be glad to establish a business relationship. Our company provides solutions${industry ? ` in ${industry}` : ""}.${instructions ? `\n\nWe would also like to mention: ${instructions}.` : ""}\n\nBest regards,\nGüvən Technology LLC`,
      sms: `Hello, ${contactName}! Güvən Technology offers collaboration${industry ? ` in ${industry}` : ""}. Good time to call back? ${instructions || ""}`,
    },
  }
  const l = fb[langName] || fb.Russian
  const subject = textType === "Email" ? l.subject : ""
  const emailBody = textType === "Email" ? l.body : l.sms
  return NextResponse.json({ success: true, data: { subject, body: emailBody, textType, tone } })
}
