import { prisma } from "@/lib/prisma"

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
    select: { chainJourneyId: true, invoiceNumber: true },
  })

  if (invoice?.chainJourneyId) {
    return invoice.chainJourneyId
  }

  // Create a dedicated journey + default steps in a transaction
  const journey = await prisma.$transaction(async (tx: any) => {
    const j = await tx.journey.create({
      data: {
        organizationId: orgId,
        name: `Цепочка: счёт ${invoice?.invoiceNumber || invoiceId}`,
        description: "Автоматическая цепочка напоминаний по счёту",
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
          config: {
            subject: "Напоминание об оплате: Счёт {{invoice_number}}",
            body: "Уважаемый {{recipient_name}},\n\nНапоминаем об оплате счёта {{invoice_number}} на сумму {{amount}}.\n\nДата оплаты: {{due_date}}\nОстаток к оплате: {{balance_due}}\n\nПросьба произвести оплату в ближайшее время.\n\nС уважением",
          },
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
          config: {
            message:
              "Напоминание: Счёт {{invoice_number}} на {{amount}} не оплачен. Остаток: {{balance_due}}. Пожалуйста, свяжитесь с нами.",
          },
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
          config: {
            message:
              "Здравствуйте, {{recipient_name}}! Счёт {{invoice_number}} ({{amount}}) всё ещё ожидает оплаты. Остаток: {{balance_due}}. Срок: {{due_date}}.",
          },
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
          config: {
            message:
              "Напоминание: Счёт {{invoice_number}} на {{amount}} не оплачен. Остаток: {{balance_due}}. Пожалуйста, свяжитесь с нами.",
          },
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
