import { prisma } from "@/lib/prisma"

type Lang = "ru" | "az" | "en"

const templates: Record<Lang, {
  journeyName: (num: string) => string
  journeyDesc: string
  emailSubject: string
  emailBody: string
  smsMessage: string
  whatsappMessage: string
  telegramMessage: string
}> = {
  ru: {
    journeyName: (num) => `Цепочка: счёт ${num}`,
    journeyDesc: "Автоматическая цепочка напоминаний по счёту",
    emailSubject: "Напоминание об оплате: Счёт {{invoice_number}}",
    emailBody:
      "Уважаемый {{recipient_name}},\n\nНапоминаем об оплате счёта {{invoice_number}} на сумму {{amount}}.\n\nДата оплаты: {{due_date}}\nОстаток к оплате: {{balance_due}}\n\nПросьба произвести оплату в ближайшее время.\n\nС уважением",
    smsMessage:
      "Напоминание: Счёт {{invoice_number}} на {{amount}} не оплачен. Остаток: {{balance_due}}. Пожалуйста, свяжитесь с нами.",
    whatsappMessage:
      "Здравствуйте, {{recipient_name}}! Счёт {{invoice_number}} ({{amount}}) всё ещё ожидает оплаты. Остаток: {{balance_due}}. Срок: {{due_date}}.",
    telegramMessage:
      "Напоминание: Счёт {{invoice_number}} на {{amount}} не оплачен. Остаток: {{balance_due}}. Пожалуйста, свяжитесь с нами.",
  },
  az: {
    journeyName: (num) => `Zəncir: hesab-faktura ${num}`,
    journeyDesc: "Hesab-faktura üzrə avtomatik xatırlatma zənciri",
    emailSubject: "Ödəniş xatırlatması: Hesab-faktura {{invoice_number}}",
    emailBody:
      "Hörmətli {{recipient_name}},\n\nHesab-faktura {{invoice_number}} məbləği {{amount}} ödənişini xatırladırıq.\n\nÖdəniş tarixi: {{due_date}}\nQalıq məbləğ: {{balance_due}}\n\nXahiş edirik ən qısa zamanda ödəniş edin.\n\nHörmətlə",
    smsMessage:
      "Xatırlatma: Hesab-faktura {{invoice_number}} məbləği {{amount}} ödənilməyib. Qalıq: {{balance_due}}. Bizimlə əlaqə saxlayın.",
    whatsappMessage:
      "Salam, {{recipient_name}}! Hesab-faktura {{invoice_number}} ({{amount}}) hələ ödənilməyib. Qalıq: {{balance_due}}. Son tarix: {{due_date}}.",
    telegramMessage:
      "Xatırlatma: Hesab-faktura {{invoice_number}} məbləği {{amount}} ödənilməyib. Qalıq: {{balance_due}}. Bizimlə əlaqə saxlayın.",
  },
  en: {
    journeyName: (num) => `Chain: invoice ${num}`,
    journeyDesc: "Automatic invoice payment reminder chain",
    emailSubject: "Payment reminder: Invoice {{invoice_number}}",
    emailBody:
      "Dear {{recipient_name}},\n\nThis is a reminder that invoice {{invoice_number}} for {{amount}} is due.\n\nDue date: {{due_date}}\nBalance due: {{balance_due}}\n\nPlease arrange payment at your earliest convenience.\n\nBest regards",
    smsMessage:
      "Reminder: Invoice {{invoice_number}} for {{amount}} is unpaid. Balance: {{balance_due}}. Please contact us.",
    whatsappMessage:
      "Hello {{recipient_name}}! Invoice {{invoice_number}} ({{amount}}) is still awaiting payment. Balance: {{balance_due}}. Due: {{due_date}}.",
    telegramMessage:
      "Reminder: Invoice {{invoice_number}} for {{amount}} is unpaid. Balance: {{balance_due}}. Please contact us.",
  },
}

/**
 * Get or create a dedicated Journey for an invoice's communication chain.
 * Each invoice gets its own Journey instance so steps can be edited independently.
 * Idempotent — safe to call multiple times.
 */
export async function getOrCreateInvoiceChainJourney(
  invoiceId: string,
  orgId: string
): Promise<string> {
  // Check if invoice already has a chain journey
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { chainJourneyId: true, invoiceNumber: true, documentLanguage: true },
  })

  if (invoice?.chainJourneyId) {
    return invoice.chainJourneyId
  }

  const lang = (invoice?.documentLanguage as Lang) || "ru"
  const t = templates[lang] || templates.ru
  const invoiceNum = invoice?.invoiceNumber || invoiceId

  // Create a dedicated journey + default steps in a transaction
  const journey = await prisma.$transaction(async (tx: any) => {
    const j = await tx.journey.create({
      data: {
        organizationId: orgId,
        name: t.journeyName(invoiceNum),
        description: t.journeyDesc,
        status: "active",
        triggerType: "invoice_chain",
      },
    })

    await tx.journeyStep.createMany({
      data: [
        {
          journeyId: j.id,
          stepOrder: 1,
          stepType: "wait",
          config: { days: 7, unit: "days" },
        },
        {
          journeyId: j.id,
          stepOrder: 2,
          stepType: "send_email",
          config: { subject: t.emailSubject, body: t.emailBody },
        },
        {
          journeyId: j.id,
          stepOrder: 3,
          stepType: "wait",
          config: { days: 3, unit: "days" },
        },
        {
          journeyId: j.id,
          stepOrder: 4,
          stepType: "sms",
          config: { message: t.smsMessage },
        },
        {
          journeyId: j.id,
          stepOrder: 5,
          stepType: "wait",
          config: { days: 3, unit: "days" },
        },
        {
          journeyId: j.id,
          stepOrder: 6,
          stepType: "send_whatsapp",
          config: { message: t.whatsappMessage },
        },
        {
          journeyId: j.id,
          stepOrder: 7,
          stepType: "wait",
          config: { days: 3, unit: "days" },
        },
        {
          journeyId: j.id,
          stepOrder: 8,
          stepType: "send_telegram",
          config: { message: t.telegramMessage },
        },
      ],
    })

    return j
  })

  // Save chainJourneyId on the invoice
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { chainJourneyId: journey.id },
  })

  return journey.id
}
