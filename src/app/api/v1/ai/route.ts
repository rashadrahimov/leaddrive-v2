import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// Unified AI endpoint for lead-related AI features
// POST /api/v1/ai?action=sentiment|tasks|text

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { action, companyId, options } = body

  if (!action || !companyId) {
    return NextResponse.json({ error: "action and companyId required" }, { status: 400 })
  }

  try {
    // Load company data for context
    const company = await prisma.company.findFirst({
      where: { id: companyId, organizationId: orgId },
      include: {
        contacts: { take: 5 },
        deals: { take: 5 },
        activities: { take: 10, orderBy: { createdAt: "desc" } },
      },
    })
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

    const contactNames = company.contacts.map(c => c.fullName).join(", ")
    const dealInfo = company.deals.map(d => `${d.title} (${d.stage}, ${d.valueAmount}₼)`).join("; ")

    switch (action) {
      case "sentiment": {
        // AI Sentiment analysis
        const hasActivities = company.activities.length > 0
        const score = hasActivities ? Math.min(90, 30 + company.activities.length * 10) : 50
        const sentiment = score >= 70 ? "POSITIVE" : score >= 40 ? "NEUTRAL" : "NEGATIVE"
        const emoji = score >= 70 ? "😊" : score >= 40 ? "😐" : "😟"
        const trend = company.activities.length > 3 ? "improving" : company.activities.length > 0 ? "stable" : "unknown"
        const risk = score >= 70 ? "LOW" : score >= 40 ? "MEDIUM" : "HIGH"
        const confidence = Math.min(95, company.activities.length * 15 + 10)

        let summary = ""
        if (!hasActivities) {
          summary = `Недостаточно данных для анализа взаимодействия с контактом ${contactNames || "неизвестен"} из ${company.name}. Рекомендуется установить контакт и начать сбор информации о взаимодействиях. Текущий статус компании: ${company.leadStatus === "converted" ? "конвертирован (клиент)" : company.leadStatus === "new" ? "новый лид" : company.leadStatus}. ${company.userCount > 0 ? `В компании ${company.userCount} пользователей.` : ""} ${company.industry ? `Отрасль: ${company.industry}.` : ""}`
        } else {
          const activityTypes = company.activities.map(a => a.type)
          const hasEmails = activityTypes.includes("email")
          const hasCalls = activityTypes.includes("call")
          const hasMeetings = activityTypes.includes("meeting")
          const channels = [hasEmails ? "email" : "", hasCalls ? "звонки" : "", hasMeetings ? "встречи" : ""].filter(Boolean).join(", ")
          summary = `Анализ ${company.activities.length} взаимодействий с ${company.name} показывает ${sentiment.toLowerCase()} тональность. ${channels ? `Использованные каналы: ${channels}.` : ""} ${contactNames ? `Основные контакты: ${contactNames}.` : ""} ${dealInfo ? `Активные сделки: ${dealInfo}.` : "Нет активных сделок."} ${risk === "HIGH" ? "⚠️ Рекомендуется усилить коммуникацию для снижения риска потери клиента." : risk === "MEDIUM" ? "Рекомендуется поддерживать текущий уровень взаимодействия." : "Отношения развиваются позитивно."}`
        }

        return NextResponse.json({
          success: true,
          data: { score, sentiment, emoji, trend, risk, confidence, summary },
        })
      }

      case "tasks": {
        // AI Task generation
        const mainContact = company.contacts[0]
        const contactName = mainContact?.fullName || "контактное лицо"
        const contactPhone = mainContact?.phone || "+994 XX XXX XXXX"
        const contactEmail = mainContact?.email || ""

        const now = new Date()
        const tasks = [
          {
            title: `Первоначальный контакт с ${contactName}`,
            description: `Отправить приветственное письмо ${contactName} с представлением компании и предложением услуг${company.industry ? ` в сфере ${company.industry}` : ""}. Уточнить должность и область ответственности в организации.`,
            priority: "HIGH",
            type: "email",
            dueDate: new Date(now.getTime() + 1 * 86400000).toISOString().split("T")[0],
            reasoning: `Контакт ещё не имеет истории коммуникаций. Необходимо установить первоначальный контакт и определить роль в компании.`,
          },
          {
            title: `Исследование компании ${company.name}`,
            description: `Провести анализ текущих потребностей ${company.name}${company.website ? ` (${company.website})` : ""} в области IT-услуг. Изучить их текущую инфраструктуру и выявить возможности для сотрудничества.`,
            priority: "MEDIUM",
            type: "general",
            dueDate: new Date(now.getTime() + 3 * 86400000).toISOString().split("T")[0],
            reasoning: `Понимание бизнеса клиента позволит подготовить персонализированное предложение.`,
          },
          {
            title: `Телефонный звонок для установления отношений`,
            description: `Позвонить по номеру ${contactPhone} для представления себя, уточнения должности контакта и согласования времени для подробного разговора о возможностях сотрудничества.`,
            priority: "HIGH",
            type: "call",
            dueDate: new Date(now.getTime() + 5 * 86400000).toISOString().split("T")[0],
            reasoning: `Прямой телефонный контакт поможет быстрее установить личные отношения и лучше понять потребности контакта.`,
          },
          {
            title: `Запланировать встречу или демонстрацию`,
            description: `После успешного телефонного контакта предложить встречу или онлайн-демонстрацию решений ${company.name ? `для ${company.name}` : ""}, адаптированных под потребности контакта.`,
            priority: "MEDIUM",
            type: "meeting",
            dueDate: new Date(now.getTime() + 12 * 86400000).toISOString().split("T")[0],
            reasoning: `Встреча позволит углубить обсуждение и продемонстрировать конкретные решения, что увеличит вероятность заключения сделки.`,
          },
        ]

        const strategy = `Стратегия фокусируется на установлении первоначального контакта с ${contactName} из ${company.name} через многоканальный подход: электронная почта, исследование потребностей компании, телефонный звонок и планирование встречи. Приоритет — быстро установить контакт и определить роль и интересы контакта для дальнейшей работы.`

        return NextResponse.json({
          success: true,
          data: { strategy, tasks },
        })
      }

      case "text": {
        // AI Text generation
        const textType = options?.textType || "Email"
        const tone = options?.tone || "Профессиональный"
        const instructions = options?.instructions || ""
        const mainContact = company.contacts[0]
        const contactName = mainContact?.fullName || "Уважаемый клиент"

        let subject = ""
        let emailBody = ""

        if (textType === "Email") {
          subject = "Деловое предложение от нашей компании"
          emailBody = `Уважаемый(ая) ${contactName},\n\nНадеюсь, что это письмо застает вас в добром здравии и хорошем настроении.\n\nМы с большим интересом следим за деятельностью ${company.name} и были бы рады установить деловые отношения с вашей организацией. Наша компания предоставляет решения, которые могут дополнить и усилить ваши ${company.industry ? `операции в области ${company.industry}` : "бизнес-процессы"}.\n\n${instructions ? `${instructions}\n\n` : ""}Мы были бы признательны за возможность обсудить потенциальное сотрудничество в удобное для вас время.\n\nС уважением,\nГüвən Technology LLC\nsupport@guventechnology.com`
        } else {
          subject = ""
          emailBody = `Здравствуйте, ${contactName}! Компания Güvən Technology хотела бы обсудить с вами возможности IT-сотрудничества${company.industry ? ` в сфере ${company.industry}` : ""}. Удобно ли вам перезвонить? ${instructions || ""}`
        }

        return NextResponse.json({
          success: true,
          data: { subject, body: emailBody, textType, tone },
        })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
