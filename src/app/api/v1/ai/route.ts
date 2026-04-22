import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { PiiMasker } from "@/lib/ai/pii-masker"
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
        ? `Последние активности (${activitiesList.length}):\n${activitiesList.map((a: any) => `- ${a.type}: ${a.subject || a.description || "без темы"} (${new Date(a.createdAt).toLocaleDateString(undefined)})`).join("\n")}`
        : "Нет истории активностей",
    ].filter(Boolean).join("\n")

    switch (action) {
      case "sentiment":
        return handleSentiment(orgId, contextBlock, contextName, contactNames, activitiesList, langName)

      case "tasks":
        return handleTasks(orgId, contextBlock, contextName, mainContactName, mainContactPhone, mainContactEmail, industry, website, langName)

      case "text":
        return handleText(orgId, contextBlock, contextName, mainContactName, industry, options, langName)

      case "whatsapp_fill_template":
        return handleWhatsAppFillTemplate(orgId, contextBlock, contextName, mainContactName, options, langName)

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
    const piiMasker = new PiiMasker()
    const maskedContextBlock = piiMasker.mask(contextBlock)
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      temperature: 0.3,
      system: `You are an Da Vinci analyst for LeadDrive CRM. Analyze client data and provide a sentiment assessment. Respond ONLY with valid JSON, no markdown. All text content MUST be in ${langName}.`,
      messages: [{
        role: "user",
        content: `Analyze the sentiment of the relationship with the client based on data:\n\n${maskedContextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"score": number 0-100, "sentiment": "POSITIVE"|"NEUTRAL"|"NEGATIVE", "emoji": "😊"|"😐"|"😟", "trend": "improving"|"stable"|"declining"|"unknown", "risk": "LOW"|"MEDIUM"|"HIGH", "confidence": number 0-100, "summary": "detailed analysis in ${langName} (2-3 sentences)"}`,
      }],
    })

    let text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    text = piiMasker.unmask(text)
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
    const piiMasker = new PiiMasker()
    const maskedContextBlock = piiMasker.mask(contextBlock)
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      temperature: 0.5,
      system: `You are an Da Vinci assistant for LeadDrive CRM. Generate smart tasks for sales managers. Consider client context. Respond ONLY with valid JSON, no markdown. All text content MUST be in ${langName}.`,
      messages: [{
        role: "user",
        content: `Based on the client data, generate 4 tasks for the manager:\n\n${maskedContextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"strategy": "brief strategy description (1-2 sentences)", "tasks": [{"title": "title", "description": "detailed description", "priority": "HIGH"|"MEDIUM"|"LOW", "type": "email"|"call"|"meeting"|"general", "dueDate": "YYYY-MM-DD", "reasoning": "why this task is important"}]}\n\nDates should start from ${new Date().toISOString().split("T")[0]}. All text content must be in ${langName}.`,
      }],
    })

    let text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    text = piiMasker.unmask(text)
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
  const topic = options?.topic || "welcome"
  const tone = options?.tone || "professional"
  const instructions = options?.instructions || ""

  const client = getClient()
  if (!client) return textFallback(textType, topic, tone, instructions, contextName, contactName, industry, langName)

  // Topic gives the AI a purpose beyond the generic "write a business email".
  // The user picks one in the Da Vinci Text form; we inject a matching goal
  // description into the prompt so the model writes the right kind of text.
  const topicGoals: Record<string, string> = {
    welcome:         "first outreach / introduction. Say who we are and why we're reaching out. Short, friendly, end with an open-ended question.",
    follow_up:       "follow-up on a previous conversation or proposal. Reference prior contact, move things forward, suggest concrete next step.",
    offer:           "commercial offer. Highlight key value points, include a clear call-to-action to discuss terms.",
    meeting_request: "request a short meeting / call. Propose 2 concrete time slots, keep it low-friction.",
    reminder:        "friendly reminder about an outstanding item (unanswered email, missed deadline, pending document). Non-pushy tone.",
    thank_you:       "thank-you note after a positive interaction. Warm, appreciative, reinforce the relationship.",
    reengagement:    "reactivation of a cold lead. Acknowledge gap politely, give a reason to re-engage (new offer, industry news).",
    custom:          "a business message tailored to the context provided. Pick the most appropriate angle from the context.",
  }
  const topicGoal = topicGoals[topic] || topicGoals.custom

  // Per-channel prompt adapters. Email is the only one that gets a subject
  // line. SMS is bound to the classic 160-char ceiling. WhatsApp / Telegram
  // are conversational — longer than SMS, shorter than email, emoji OK but
  // never spammy, two short paragraphs max.
  const instructionsBlock = instructions
    ? `IMPORTANT — naturally weave this idea (rephrase elegantly, don't copy literally): "${instructions}"\n`
    : ""
  const goalLine = `Purpose: ${topicGoal}\n`
  const promptsByType: Record<string, string> = {
    Email:
      `Write a business email for ${contactName} from ${contextName}.\n${goalLine}Tone: ${tone}.\n${instructionsBlock}\nClient context:\n${contextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"subject": "email subject aligned with the purpose", "body": "email body", "textType": "Email", "tone": "${tone}"}`,
    SMS:
      `Write an SMS message for ${contactName} from ${contextName}.\n${goalLine}Tone: ${tone}.\n${instructionsBlock}\nContext:\n${contextBlock}\n\nRespond with JSON (all text values in ${langName}):\n{"subject": "", "body": "SMS text (up to 160 chars, no emoji, plain)", "textType": "SMS", "tone": "${tone}"}`,
    WhatsApp:
      `Write a WhatsApp business message for ${contactName} from ${contextName}.\n${goalLine}Tone: ${tone}.\n${instructionsBlock}\nContext:\n${contextBlock}\n\nRules: 2-4 short sentences max, conversational but professional, one relevant emoji is OK (never more than one), no subject line, sign off with first name only.\n\nRespond with JSON (all text values in ${langName}):\n{"subject": "", "body": "WhatsApp message body", "textType": "WhatsApp", "tone": "${tone}"}`,
    Telegram:
      `Write a Telegram business message for ${contactName} from ${contextName}.\n${goalLine}Tone: ${tone}.\n${instructionsBlock}\nContext:\n${contextBlock}\n\nRules: 2-4 sentences max, conversational, Telegram-friendly (can use bold via *asterisks* sparingly), one relevant emoji max, no subject line, sign off with first name only.\n\nRespond with JSON (all text values in ${langName}):\n{"subject": "", "body": "Telegram message body", "textType": "Telegram", "tone": "${tone}"}`,
  }
  const prompt = promptsByType[textType] || promptsByType.Email

  try {
    const piiMasker = new PiiMasker()
    const maskedPrompt = piiMasker.mask(prompt)
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      temperature: 0.7,
      system: `You are an Da Vinci copywriter for LeadDrive CRM. Write professional texts for business communications. Respond ONLY with valid JSON, no markdown. Signature: LeadDrive Inc. All text content MUST be in ${langName}.`,
      messages: [{ role: "user", content: maskedPrompt }],
    })

    let text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    text = piiMasker.unmask(text)
    // Strip markdown code fences if Claude wraps response in ```json ... ```
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const data = JSON.parse(text)
    await logAiCall(orgId, `[text-${textType}/${topic}] ${contextName}`, text.slice(0, 500), Date.now() - t0, "claude-haiku-4-5-20251001", response.usage)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Claude text error:", error)
    return textFallback(textType, topic, tone, instructions, contextName, contactName, industry, langName)
  }
}

// ── WHATSAPP TEMPLATE VARIABLE FILL ─────────────────────────
//
// Input: options.variables (string[]) — list of variable names from the
// stored WhatsAppTemplate row (either positional "1","2"... or named like
// "customer_name"). Optionally options.templateBody for better context.
// Output: data.variables as a map { varName: suggestedValue } so the UI
// can plug them straight into the form.
async function handleWhatsAppFillTemplate(
  orgId: string,
  contextBlock: string,
  contextName: string,
  contactName: string,
  options: any,
  langName: string,
) {
  const variables: string[] = Array.isArray(options?.variables) ? options.variables : []
  const templateBody: string = options?.templateBody || ""
  const templateName: string = options?.templateName || "template"

  if (variables.length === 0) {
    return NextResponse.json({ success: true, data: { variables: {} } })
  }

  const client = getClient()
  if (!client) {
    // No AI — return best-effort heuristic fills from context.
    const fallback: Record<string, string> = {}
    for (const v of variables) {
      const low = v.toLowerCase()
      if (/name|contact|client/.test(low)) fallback[v] = contactName
      else if (/company|org|business/.test(low)) fallback[v] = contextName
      else fallback[v] = ""
    }
    return NextResponse.json({ success: true, data: { variables: fallback } })
  }

  const prompt = `You are filling variables for a WhatsApp business template.

Template name: ${templateName}
${templateBody ? `Template body:\n${templateBody}\n` : ""}
Variables to fill: ${variables.join(", ")}

Client context:
${contextBlock}

For each variable name, suggest a concrete value to plug in, inferring from the client context. Keep values short (1-4 words for names/titles, numbers for amounts/dates). If the context doesn't give enough info, pick a reasonable default (e.g. "there" for a missing name). Never leave values empty.

Respond with JSON only (all text values in ${langName}):
{"variables": {${variables.map(v => `"${v}": "suggested value"`).join(", ")}}}`

  try {
    const piiMasker = new PiiMasker()
    const maskedPrompt = piiMasker.mask(prompt)
    const t0 = Date.now()
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      temperature: 0.3,
      system: `You are a careful assistant filling structured form fields for LeadDrive CRM. Respond ONLY with valid JSON, no markdown. All text content MUST be in ${langName}.`,
      messages: [{ role: "user", content: maskedPrompt }],
    })

    let text = response.content.filter(b => b.type === "text").map(b => b.text).join("")
    text = piiMasker.unmask(text)
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const data = JSON.parse(text)
    await logAiCall(orgId, `[wa-fill/${templateName}] ${contextName}`, text.slice(0, 500), Date.now() - t0, "claude-haiku-4-5-20251001", response.usage)
    // Ensure every requested variable is present in the response.
    const safe: Record<string, string> = {}
    for (const v of variables) safe[v] = String(data?.variables?.[v] ?? "")
    return NextResponse.json({ success: true, data: { variables: safe } })
  } catch (error) {
    console.error("Claude wa-fill error:", error)
    const fallback: Record<string, string> = {}
    for (const v of variables) {
      const low = v.toLowerCase()
      if (/name|contact|client/.test(low)) fallback[v] = contactName
      else if (/company|org|business/.test(low)) fallback[v] = contextName
      else fallback[v] = ""
    }
    return NextResponse.json({ success: true, data: { variables: fallback } })
  }
}

function textFallback(textType: string, topic: string, tone: string, instructions: string, contextName: string, contactName: string, industry: string, langName: string) {
  // Topic-specific subject lines. Body text stays relatively generic —
  // the fallback is only hit when ANTHROPIC_API_KEY is missing or the
  // model call fails, and the user is expected to edit in the UI anyway.
  const subjectsByTopic: Record<string, Record<string, string>> = {
    welcome:         { Russian: "Знакомство с LeadDrive",              Azerbaijani: "LeadDrive ilə tanışlıq",         English: "Introduction — LeadDrive" },
    follow_up:       { Russian: "Follow-up по нашему разговору",         Azerbaijani: "Söhbətimiz üzrə follow-up",      English: "Follow-up on our conversation" },
    offer:           { Russian: "Коммерческое предложение",               Azerbaijani: "Kommersiya təklifi",             English: "Commercial proposal" },
    meeting_request: { Russian: "Предлагаю короткую встречу",             Azerbaijani: "Qısa görüş təklif edirəm",       English: "Short meeting request" },
    reminder:        { Russian: "Дружеское напоминание",                   Azerbaijani: "Dostluq xatırlatması",           English: "Friendly reminder" },
    thank_you:       { Russian: "Спасибо за время",                        Azerbaijani: "Vaxtınız üçün təşəkkür",          English: "Thank you for your time" },
    reengagement:    { Russian: "Давно не общались",                       Azerbaijani: "Uzun müddətdir əlaqə saxlamırıq", English: "It's been a while" },
    custom:          { Russian: "Деловое предложение",                     Azerbaijani: "İşgüzar təklif",                  English: "Business proposal" },
  }
  const subjectOverride = (subjectsByTopic[topic] || subjectsByTopic.custom)[langName]
  // Fallback copy used when STRIPE/ANTHROPIC key is missing or the model
  // call failed. Messaging channels (WhatsApp / Telegram) reuse the SMS
  // body — it's short and friendly enough to work for all of them.
  const fb: Record<string, { subject: string; body: string; sms: string; messenger: string }> = {
    Russian: {
      subject: "Деловое предложение от нашей компании",
      body: `Уважаемый(ая) ${contactName},\n\nНадеюсь, что это письмо застает вас в добром здравии.\n\nМы с интересом следим за деятельностью ${contextName} и были бы рады установить деловые отношения. Наша компания предоставляет решения${industry ? ` в области ${industry}` : ""}.${instructions ? `\n\nТакже хотим отметить: ${instructions}.` : ""}\n\nС уважением,\nLeadDrive Inc.`,
      sms: `Здравствуйте, ${contactName}! LeadDrive предлагает сотрудничество${industry ? ` в сфере ${industry}` : ""}. Удобно перезвонить? ${instructions || ""}`,
      messenger: `Здравствуйте, ${contactName}! 👋\n\nLeadDrive предлагает сотрудничество${industry ? ` в сфере ${industry}` : ""}. ${instructions ? instructions + " " : ""}Удобно коротко созвониться на этой неделе?\n\n— Rashad`,
    },
    Azerbaijani: {
      subject: "Şirkətimizdən işgüzar təklif",
      body: `Hörmətli ${contactName},\n\nÜmid edirik ki, bu məktub sizi yaxşı vəziyyətdə tapır.\n\n${contextName} şirkətinin fəaliyyətini maraqla izləyirik və işgüzar əlaqələr qurmaqdan məmnun olarıq. Şirkətimiz ${industry ? `${industry} sahəsində ` : ""}həllər təqdim edir.${instructions ? `\n\nHəmçinin qeyd etmək istərdik: ${instructions}.` : ""}\n\nHörmətlə,\nLeadDrive Inc.`,
      sms: `Salam, ${contactName}! LeadDrive ${industry ? `${industry} sahəsində ` : ""}əməkdaşlıq təklif edir. Geri zəng etmək münasibdir? ${instructions || ""}`,
      messenger: `Salam, ${contactName}! 👋\n\nLeadDrive ${industry ? `${industry} sahəsində ` : ""}əməkdaşlıq təklif edir. ${instructions ? instructions + " " : ""}Bu həftə qısa zəng üçün münasib vaxtınız olarmı?\n\n— Rashad`,
    },
    English: {
      subject: "Business proposal from our company",
      body: `Dear ${contactName},\n\nI hope this email finds you well.\n\nWe have been following ${contextName}'s activities with great interest and would be glad to establish a business relationship. Our company provides solutions${industry ? ` in ${industry}` : ""}.${instructions ? `\n\nWe would also like to mention: ${instructions}.` : ""}\n\nBest regards,\nLeadDrive Inc.`,
      sms: `Hello, ${contactName}! LeadDrive offers collaboration${industry ? ` in ${industry}` : ""}. Good time to call back? ${instructions || ""}`,
      messenger: `Hi ${contactName}! 👋\n\nLeadDrive offers collaboration${industry ? ` in ${industry}` : ""}. ${instructions ? instructions + " " : ""}Any chance of a short call this week?\n\n— Rashad`,
    },
  }
  const l = fb[langName] || fb.Russian
  const subject = textType === "Email" ? (subjectOverride || l.subject) : ""
  const body =
    textType === "Email" ? l.body :
    textType === "SMS"   ? l.sms :
                           l.messenger
  return NextResponse.json({ success: true, data: { subject, body, textType, topic, tone } })
}
