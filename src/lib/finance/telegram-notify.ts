/**
 * Finance Multi-Channel Notifications
 * Sends payment-related alerts via Telegram, Email, and In-App
 * Respects per-org notification settings from Organization.settings.financeNotifications
 */

import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const CHAT_ID = process.env.TELEGRAM_FINANCE_CHAT_ID || ""

interface NotifChannelSettings {
  enabled: boolean
  channels: string[]
}

interface FinanceNotifSettings {
  recipientEmail: string
  overdue: NotifChannelSettings
  advance: NotifChannelSettings & { daysBeforeDeadline: number }
  paymentOrders: NotifChannelSettings
  billPayments: NotifChannelSettings
}

const DEFAULTS: FinanceNotifSettings = {
  recipientEmail: "",
  overdue: { enabled: true, channels: ["telegram"] },
  advance: { enabled: true, channels: ["telegram"], daysBeforeDeadline: 7 },
  paymentOrders: { enabled: true, channels: ["telegram"] },
  billPayments: { enabled: true, channels: ["telegram"] },
}

/** Load notification settings for an organization */
async function getNotifSettings(orgId?: string): Promise<FinanceNotifSettings> {
  if (!orgId) return DEFAULTS
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    })
    const settings = (org?.settings as Record<string, any>) || {}
    return { ...DEFAULTS, ...settings.financeNotifications }
  } catch {
    return DEFAULTS
  }
}

/** Send notification to all enabled channels for a category */
async function sendToChannels(
  category: NotifChannelSettings,
  settings: FinanceNotifSettings,
  orgId: string | undefined,
  telegramText: string,
  emailSubject: string,
  emailHtml: string,
  inAppTitle: string,
  inAppMessage: string,
  entityType?: string,
  entityId?: string,
) {
  if (!category.enabled) return

  const promises: Promise<any>[] = []

  // Telegram
  if (category.channels.includes("telegram")) {
    promises.push(sendTelegram(telegramText))
  }

  // Email
  if (category.channels.includes("email") && settings.recipientEmail && orgId) {
    promises.push(
      sendEmail({
        to: settings.recipientEmail,
        subject: emailSubject,
        html: emailHtml,
        organizationId: orgId,
      }).catch((e) => console.error("[Finance Email]", e))
    )
  }

  // In-App notification — create for all admin users in org
  if (category.channels.includes("inApp") && orgId) {
    promises.push(
      (async () => {
        try {
          const admins = await prisma.user.findMany({
            where: { organizationId: orgId, role: { in: ["admin", "owner"] } },
            select: { id: true },
          })
          // Fallback: if no admins found, get all users
          const users = admins.length > 0 ? admins : await prisma.user.findMany({
            where: { organizationId: orgId },
            select: { id: true },
            take: 5,
          })
          await prisma.notification.createMany({
            data: users.map((u) => ({
              organizationId: orgId!,
              userId: u.id,
              type: "finance",
              title: inAppTitle,
              message: inAppMessage,
              entityType: entityType || "finance",
              entityId: entityId || "",
            })),
          })
        } catch (e) {
          console.error("[Finance InApp]", e)
        }
      })()
    )
  }

  await Promise.allSettled(promises)
}

async function sendTelegram(text: string): Promise<boolean> {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("[Finance TG] Bot not configured, skipping notification")
    return false
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
    })
    if (!res.ok) {
      console.error("[Finance TG] Send failed:", await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error("[Finance TG] Error:", e)
    return false
  }
}

/** Get advance warning days from org settings */
export async function getAdvanceDays(orgId?: string): Promise<number> {
  const settings = await getNotifSettings(orgId)
  return settings.advance.daysBeforeDeadline
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("ru-RU")
}

// ─── Notification types ────────────────────────────────────────────────

/** New overdue bills detected */
export async function notifyOverdueBills(bills: { billNumber: string; vendorName: string; amount: number; dueDate: Date | string }[], orgId?: string) {
  if (bills.length === 0) return
  const settings = await getNotifSettings(orgId)
  const total = bills.reduce((s, b) => s + b.amount, 0)
  const list = bills.slice(0, 10).map((b) => `${b.billNumber} — ${b.vendorName}: ${fmt(b.amount)} AZN (срок ${fmtDate(b.dueDate)})`).join("\n")

  let tgText = `🔴 <b>Просрочка: ${bills.length} счёт(ов) на ${fmt(total)} AZN</b>\n\n`
  bills.slice(0, 10).forEach((b) => { tgText += `• ${b.billNumber} — ${b.vendorName}: <b>${fmt(b.amount)} AZN</b> (срок ${fmtDate(b.dueDate)})\n` })
  if (bills.length > 10) tgText += `\n...и ещё ${bills.length - 10}\n`
  tgText += `\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=payables">Открыть кредиторку</a>`

  const emailHtml = `<h2>Просрочка: ${bills.length} счёт(ов) на ${fmt(total)} AZN</h2><ul>${bills.slice(0, 10).map((b) => `<li>${b.billNumber} — ${b.vendorName}: <b>${fmt(b.amount)} AZN</b></li>`).join("")}</ul><p><a href="https://app.leaddrivecrm.org/finance?tab=payables">Открыть кредиторку</a></p>`

  await sendToChannels(settings.overdue, settings, orgId, tgText,
    `Просрочка: ${bills.length} счёт(ов) на ${fmt(total)} AZN`, emailHtml,
    "Просроченные платежи", `${bills.length} счёт(ов) на ${fmt(total)} AZN`, "bill")
}

/** New overdue invoices detected */
export async function notifyOverdueInvoices(invoices: { invoiceNumber: string; companyName: string; amount: number; dueDate: Date | string }[], orgId?: string) {
  if (invoices.length === 0) return
  const settings = await getNotifSettings(orgId)
  const total = invoices.reduce((s, b) => s + b.amount, 0)

  let tgText = `🔴 <b>Просрочка A/R: ${invoices.length} инвойс(ов) на ${fmt(total)} AZN</b>\n\n`
  invoices.slice(0, 10).forEach((inv) => { tgText += `• ${inv.invoiceNumber} — ${inv.companyName}: <b>${fmt(inv.amount)} AZN</b>\n` })
  tgText += `\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=receivables">Открыть дебиторку</a>`

  const emailHtml = `<h2>Просрочка A/R: ${invoices.length} инвойс(ов) на ${fmt(total)} AZN</h2><ul>${invoices.slice(0, 10).map((inv) => `<li>${inv.invoiceNumber} — ${inv.companyName}: <b>${fmt(inv.amount)} AZN</b></li>`).join("")}</ul><p><a href="https://app.leaddrivecrm.org/finance?tab=receivables">Открыть дебиторку</a></p>`

  await sendToChannels(settings.overdue, settings, orgId, tgText,
    `Просрочка A/R: ${invoices.length} инвойс(ов) на ${fmt(total)} AZN`, emailHtml,
    "Просроченные инвойсы", `${invoices.length} инвойс(ов) на ${fmt(total)} AZN`, "invoice")
}

/** Upcoming deadlines */
export async function notifyUpcomingDeadlines(
  bills: { billNumber: string; vendorName: string; amount: number; dueDate: Date | string }[],
  invoices: { invoiceNumber: string; companyName: string; amount: number; dueDate: Date | string }[],
  daysAhead: number,
  orgId?: string,
) {
  if (bills.length === 0 && invoices.length === 0) return
  const settings = await getNotifSettings(orgId)

  let tgText = `⏰ <b>Дедлайны на ближайшие ${daysAhead} дн.</b>\n`
  let emailHtml = `<h2>Дедлайны на ближайшие ${daysAhead} дн.</h2>`
  let summary = ""

  if (bills.length > 0) {
    const total = bills.reduce((s, b) => s + b.amount, 0)
    tgText += `\n<b>📤 К оплате (${bills.length} шт., ${fmt(total)} AZN):</b>\n`
    emailHtml += `<h3>К оплате (${bills.length} шт., ${fmt(total)} AZN)</h3><ul>`
    bills.slice(0, 5).forEach((b) => {
      tgText += `• ${b.billNumber} — ${b.vendorName}: ${fmt(b.amount)} AZN (до ${fmtDate(b.dueDate)})\n`
      emailHtml += `<li>${b.billNumber} — ${b.vendorName}: ${fmt(b.amount)} AZN</li>`
    })
    emailHtml += "</ul>"
    summary += `${bills.length} к оплате`
  }
  if (invoices.length > 0) {
    const total = invoices.reduce((s, b) => s + b.amount, 0)
    tgText += `\n<b>📥 Ожидаем оплату (${invoices.length} шт., ${fmt(total)} AZN):</b>\n`
    emailHtml += `<h3>Ожидаем оплату (${invoices.length} шт., ${fmt(total)} AZN)</h3><ul>`
    invoices.slice(0, 5).forEach((inv) => {
      tgText += `• ${inv.invoiceNumber} — ${inv.companyName}: ${fmt(inv.amount)} AZN\n`
      emailHtml += `<li>${inv.invoiceNumber} — ${inv.companyName}: ${fmt(inv.amount)} AZN</li>`
    })
    emailHtml += "</ul>"
    summary += `${summary ? ", " : ""}${invoices.length} ожидаем`
  }
  tgText += `\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=payments">Открыть платежи</a>`
  emailHtml += `<p><a href="https://app.leaddrivecrm.org/finance?tab=payments">Открыть платежи</a></p>`

  await sendToChannels(settings.advance, settings, orgId, tgText,
    `Дедлайны: ${summary}`, emailHtml,
    "Приближающиеся дедлайны", summary)
}

/** Payment order executed */
export async function notifyPaymentOrderExecuted(order: {
  orderNumber: string; counterpartyName: string; amount: number; currency: string; purpose: string
}, orgId?: string) {
  const settings = await getNotifSettings(orgId)
  const tgText = `✅ <b>Платёжное поручение исполнено</b>\n\n📋 ${order.orderNumber}\n🏢 ${order.counterpartyName}\n💰 <b>${fmt(order.amount)} ${order.currency}</b>\n📝 ${order.purpose}\n\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=payments">Открыть платежи</a>`
  const emailHtml = `<h2>Платёжное поручение исполнено</h2><p><b>${order.orderNumber}</b> — ${order.counterpartyName}</p><p>Сумма: <b>${fmt(order.amount)} ${order.currency}</b></p><p>${order.purpose}</p><p><a href="https://app.leaddrivecrm.org/finance?tab=payments">Открыть платежи</a></p>`

  await sendToChannels(settings.paymentOrders, settings, orgId, tgText,
    `ПП ${order.orderNumber} исполнено — ${fmt(order.amount)} ${order.currency}`, emailHtml,
    "ПП исполнено", `${order.orderNumber}: ${fmt(order.amount)} ${order.currency} — ${order.counterpartyName}`, "payment_order")
}

/** Payment order submitted for approval */
export async function notifyPaymentOrderPending(order: {
  orderNumber: string; counterpartyName: string; amount: number; currency: string; purpose: string
}, orgId?: string) {
  const settings = await getNotifSettings(orgId)
  const tgText = `🔔 <b>Платёжное поручение на согласовании</b>\n\n📋 ${order.orderNumber}\n🏢 ${order.counterpartyName}\n💰 <b>${fmt(order.amount)} ${order.currency}</b>\n📝 ${order.purpose}\n\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=payments">Одобрить / Отклонить</a>`
  const emailHtml = `<h2>ПП на согласовании</h2><p><b>${order.orderNumber}</b> — ${order.counterpartyName}</p><p>Сумма: <b>${fmt(order.amount)} ${order.currency}</b></p><p>${order.purpose}</p><p><a href="https://app.leaddrivecrm.org/finance?tab=payments">Одобрить / Отклонить</a></p>`

  await sendToChannels(settings.paymentOrders, settings, orgId, tgText,
    `ПП ${order.orderNumber} на согласовании — ${fmt(order.amount)} ${order.currency}`, emailHtml,
    "ПП на согласовании", `${order.orderNumber}: ${fmt(order.amount)} ${order.currency} — ${order.counterpartyName}`, "payment_order")
}

/** Bill payment recorded */
export async function notifyBillPaymentRecorded(bill: {
  billNumber: string; vendorName: string; paymentAmount: number; remainingBalance: number; currency: string
}, orgId?: string) {
  const settings = await getNotifSettings(orgId)
  const emoji = bill.remainingBalance <= 0 ? "✅" : "💸"
  const status = bill.remainingBalance <= 0 ? "Полностью оплачен" : `Остаток: ${fmt(bill.remainingBalance)} ${bill.currency}`

  const tgText = `${emoji} <b>Оплата по счёту</b>\n\n📋 ${bill.billNumber} — ${bill.vendorName}\n💰 Оплачено: <b>${fmt(bill.paymentAmount)} ${bill.currency}</b>\n📊 ${status}\n\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=payables">Открыть кредиторку</a>`
  const emailHtml = `<h2>Оплата по счёту ${bill.billNumber}</h2><p>${bill.vendorName}</p><p>Оплачено: <b>${fmt(bill.paymentAmount)} ${bill.currency}</b></p><p>${status}</p><p><a href="https://app.leaddrivecrm.org/finance?tab=payables">Открыть кредиторку</a></p>`

  await sendToChannels(settings.billPayments, settings, orgId, tgText,
    `Оплата: ${bill.billNumber} — ${fmt(bill.paymentAmount)} ${bill.currency}`, emailHtml,
    "Оплата по счёту", `${bill.billNumber}: ${fmt(bill.paymentAmount)} ${bill.currency}. ${status}`, "bill")
}
