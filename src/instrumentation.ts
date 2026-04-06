/**
 * Next.js Instrumentation — runs once when the server starts.
 * Used for Sentry init and periodic tasks like journey step processing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize Sentry for Node.js runtime
    await import("../sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    // Initialize Sentry for Edge runtime
    await import("../sentry.edge.config")
  }

  // Only run cron tasks on the server (not during build or in edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const INTERVAL_MS = 60_000 // 1 minute

    // Avoid duplicate intervals on HMR in dev
    const globalObj = globalThis as any
    if (globalObj.__journeyCronStarted) return
    globalObj.__journeyCronStarted = true

    console.log("[Journey Cron] Starting scheduler — every 60s")

    setInterval(async () => {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret) return
        const res = await fetch(`${baseUrl}/api/v1/journeys/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cronSecret}`,
          },
        })
        const data = await res.json()
        if (data.processed > 0) {
          console.log(`[Journey Cron] Processed ${data.processed} enrollment(s):`, JSON.stringify(data.results.map((r: any) => ({ id: r.enrollmentId, step: r.stepType, status: r.status, message: r.message }))))
        }
      } catch (err: any) {
        console.error("[Journey Cron] Error:", err.message)
      }
    }, INTERVAL_MS)

    // Finance deadline checker — runs every 6 hours, first run 5 min after start
    if (!globalObj.__financeDeadlineCronStarted) {
      globalObj.__financeDeadlineCronStarted = true
      const FINANCE_INTERVAL = 6 * 60 * 60 * 1000 // 6 hours
      const FINANCE_FIRST_RUN = 5 * 60 * 1000 // 5 min after start

      const runFinanceCheck = async () => {
        try {
          const { PrismaClient } = require("@prisma/client")
          const prisma = new PrismaClient()
          const now = new Date()
          const orgs = await prisma.organization.findMany({ select: { id: true } })

          let totalBills = 0
          let totalInvoices = 0

          for (const org of orgs) {
            // Auto-update overdue statuses directly via Prisma (bypasses middleware)
            const [bills, invoices] = await Promise.all([
              prisma.bill.updateMany({
                where: { organizationId: org.id, dueDate: { lt: now }, status: { in: ["pending", "partially_paid"] }, balanceDue: { gt: 0 } },
                data: { status: "overdue" },
              }),
              prisma.invoice.updateMany({
                where: { organizationId: org.id, dueDate: { lt: now }, status: { in: ["sent", "viewed", "partially_paid"] }, balanceDue: { gt: 0 } },
                data: { status: "overdue" },
              }),
            ])
            totalBills += bills.count
            totalInvoices += invoices.count

            // Send Telegram notifications if any new overdue found
            if (bills.count > 0 || invoices.count > 0) {
              const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
              const CHAT_ID = process.env.TELEGRAM_FINANCE_CHAT_ID
              if (BOT_TOKEN && CHAT_ID) {
                const text = `🔴 <b>[Авто-проверка] Новые просрочки</b>\n\nСчетов к оплате: ${bills.count}\nИнвойсов: ${invoices.count}\n\n📎 <a href="https://app.leaddrivecrm.org/finance">Открыть финансы</a>`
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
                }).catch(() => {})
              }
            }
          }
          await prisma.$disconnect()
          if (totalBills > 0 || totalInvoices > 0) {
            console.log(`[Finance Cron] Updated ${totalBills} overdue bills, ${totalInvoices} overdue invoices`)
          } else {
            console.log(`[Finance Cron] No new overdue items`)
          }
        } catch (err: any) {
          console.error("[Finance Cron] Error:", err.message)
        }
      }

      setTimeout(() => {
        runFinanceCheck()
        setInterval(runFinanceCheck, FINANCE_INTERVAL)
      }, FINANCE_FIRST_RUN)

      console.log("[Finance Cron] Starting deadline checker — every 6h (first run in 5min)")
    }
  }
}
