/**
 * Finance Telegram Notifications
 * Sends payment-related alerts to Telegram chat
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const CHAT_ID = process.env.TELEGRAM_FINANCE_CHAT_ID || ""

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

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("ru-RU")
}

// ─── Notification types ────────────────────────────────────────────────

/** New overdue bills/invoices detected */
export async function notifyOverdueBills(bills: { billNumber: string; vendorName: string; amount: number; dueDate: Date | string }[]) {
  if (bills.length === 0) return
  const total = bills.reduce((s, b) => s + b.amount, 0)
  let text = `🔴 <b>Просрочка: ${bills.length} счёт(ов) на ${fmt(total)} AZN</b>\n\n`
  for (const b of bills.slice(0, 10)) {
    text += `• ${b.billNumber} — ${b.vendorName}: <b>${fmt(b.amount)} AZN</b> (срок ${fmtDate(b.dueDate)})\n`
  }
  if (bills.length > 10) text += `\n...и ещё ${bills.length - 10}\n`
  text += `\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=payables">Открыть кредиторку</a>`
  await sendTelegram(text)
}

export async function notifyOverdueInvoices(invoices: { invoiceNumber: string; companyName: string; amount: number; dueDate: Date | string }[]) {
  if (invoices.length === 0) return
  const total = invoices.reduce((s, b) => s + b.amount, 0)
  let text = `🔴 <b>Просрочка A/R: ${invoices.length} инвойс(ов) на ${fmt(total)} AZN</b>\n\n`
  for (const inv of invoices.slice(0, 10)) {
    text += `• ${inv.invoiceNumber} — ${inv.companyName}: <b>${fmt(inv.amount)} AZN</b> (срок ${fmtDate(inv.dueDate)})\n`
  }
  if (invoices.length > 10) text += `\n...и ещё ${invoices.length - 10}\n`
  text += `\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=receivables">Открыть дебиторку</a>`
  await sendTelegram(text)
}

/** Upcoming deadlines (bills/invoices due within N days) */
export async function notifyUpcomingDeadlines(
  bills: { billNumber: string; vendorName: string; amount: number; dueDate: Date | string }[],
  invoices: { invoiceNumber: string; companyName: string; amount: number; dueDate: Date | string }[],
  daysAhead: number,
) {
  if (bills.length === 0 && invoices.length === 0) return
  let text = `⏰ <b>Дедлайны на ближайшие ${daysAhead} дн.</b>\n`

  if (bills.length > 0) {
    const total = bills.reduce((s, b) => s + b.amount, 0)
    text += `\n<b>📤 К оплате (${bills.length} шт., ${fmt(total)} AZN):</b>\n`
    for (const b of bills.slice(0, 5)) {
      text += `• ${b.billNumber} — ${b.vendorName}: ${fmt(b.amount)} AZN (до ${fmtDate(b.dueDate)})\n`
    }
    if (bills.length > 5) text += `  ...и ещё ${bills.length - 5}\n`
  }

  if (invoices.length > 0) {
    const total = invoices.reduce((s, b) => s + b.amount, 0)
    text += `\n<b>📥 Ожидаем оплату (${invoices.length} шт., ${fmt(total)} AZN):</b>\n`
    for (const inv of invoices.slice(0, 5)) {
      text += `• ${inv.invoiceNumber} — ${inv.companyName}: ${fmt(inv.amount)} AZN (до ${fmtDate(inv.dueDate)})\n`
    }
    if (invoices.length > 5) text += `  ...и ещё ${invoices.length - 5}\n`
  }

  text += `\n📎 <a href="https://app.leaddrivecrm.org/finance?tab=payments">Открыть платежи</a>`
  await sendTelegram(text)
}

/** Payment order executed */
export async function notifyPaymentOrderExecuted(order: {
  orderNumber: string
  counterpartyName: string
  amount: number
  currency: string
  purpose: string
}) {
  const text = `✅ <b>Платёжное поручение исполнено</b>\n\n` +
    `📋 ${order.orderNumber}\n` +
    `🏢 ${order.counterpartyName}\n` +
    `💰 <b>${fmt(order.amount)} ${order.currency}</b>\n` +
    `📝 ${order.purpose}\n\n` +
    `📎 <a href="https://app.leaddrivecrm.org/finance?tab=payments">Открыть платежи</a>`
  await sendTelegram(text)
}

/** Payment order submitted for approval */
export async function notifyPaymentOrderPending(order: {
  orderNumber: string
  counterpartyName: string
  amount: number
  currency: string
  purpose: string
}) {
  const text = `🔔 <b>Платёжное поручение на согласовании</b>\n\n` +
    `📋 ${order.orderNumber}\n` +
    `🏢 ${order.counterpartyName}\n` +
    `💰 <b>${fmt(order.amount)} ${order.currency}</b>\n` +
    `📝 ${order.purpose}\n\n` +
    `📎 <a href="https://app.leaddrivecrm.org/finance?tab=payments">Одобрить / Отклонить</a>`
  await sendTelegram(text)
}

/** Bill payment recorded */
export async function notifyBillPaymentRecorded(bill: {
  billNumber: string
  vendorName: string
  paymentAmount: number
  remainingBalance: number
  currency: string
}) {
  const emoji = bill.remainingBalance <= 0 ? "✅" : "💸"
  const status = bill.remainingBalance <= 0 ? "Полностью оплачен" : `Остаток: ${fmt(bill.remainingBalance)} ${bill.currency}`
  const text = `${emoji} <b>Оплата по счёту</b>\n\n` +
    `📋 ${bill.billNumber} — ${bill.vendorName}\n` +
    `💰 Оплачено: <b>${fmt(bill.paymentAmount)} ${bill.currency}</b>\n` +
    `📊 ${status}\n\n` +
    `📎 <a href="https://app.leaddrivecrm.org/finance?tab=payables">Открыть кредиторку</a>`
  await sendTelegram(text)
}
