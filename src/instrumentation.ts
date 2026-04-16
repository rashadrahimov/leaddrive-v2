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
          let totalExpiredContracts = 0
          let totalExpiringContracts = 0

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

            // Auto-expire contracts where endDate < now and status is active/expiring
            const expiredContracts = await prisma.contract.updateMany({
              where: {
                organizationId: org.id,
                endDate: { lt: now },
                status: { in: ["active", "expiring"] },
              },
              data: { status: "expired" },
            })
            totalExpiredContracts += expiredContracts.count

            // Auto-mark contracts expiring within 30 days
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            const expiringContracts = await prisma.contract.updateMany({
              where: {
                organizationId: org.id,
                endDate: { gt: now, lte: thirtyDaysFromNow },
                status: "active",
              },
              data: { status: "expiring" },
            })
            totalExpiringContracts += expiringContracts.count

            // Send Telegram notifications if any new overdue found
            if (bills.count > 0 || invoices.count > 0) {
              const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
              const CHAT_ID = process.env.TELEGRAM_FINANCE_CHAT_ID
              if (BOT_TOKEN && CHAT_ID) {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.leaddrivecrm.org"
                const text = `🔴 <b>[Auto-check] New overdue items</b>\n\nOverdue bills: ${bills.count}\nOverdue invoices: ${invoices.count}\n\n📎 <a href="${appUrl}/finance">Open finance</a>`
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
                }).catch(() => {})
              }
            }

            // Send Telegram notification for expired/expiring contracts
            if (expiredContracts.count > 0 || expiringContracts.count > 0) {
              const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
              const CHAT_ID = process.env.TELEGRAM_FINANCE_CHAT_ID
              if (BOT_TOKEN && CHAT_ID) {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.leaddrivecrm.org"
                const text = `📋 <b>[Contracts] Status auto-update</b>\n\nExpired: ${expiredContracts.count}\nExpiring within 30 days: ${expiringContracts.count}\n\n📎 <a href="${appUrl}/contracts">Open contracts</a>`
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
          }
          if (totalExpiredContracts > 0 || totalExpiringContracts > 0) {
            console.log(`[Finance Cron] Contracts: ${totalExpiredContracts} expired, ${totalExpiringContracts} marked expiring`)
          }
          if (totalBills === 0 && totalInvoices === 0 && totalExpiredContracts === 0 && totalExpiringContracts === 0) {
            console.log(`[Finance Cron] No new overdue items or contract status changes`)
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

    // MTM auto-checkout cron — runs every 15 minutes
    if (!globalObj.__mtmAutoCheckoutCronStarted) {
      globalObj.__mtmAutoCheckoutCronStarted = true
      const MTM_INTERVAL = 15 * 60 * 1000 // 15 minutes
      const MTM_FIRST_RUN = 2 * 60 * 1000 // 2 min after start

      const runMtmAutoCheckout = async () => {
        try {
          const { PrismaClient } = require("@prisma/client")
          const prisma = new PrismaClient()
          const now = new Date()
          const orgs = await prisma.organization.findMany({ select: { id: true } })

          let totalAutoCheckedOut = 0

          for (const org of orgs) {
            // Get autoCheckoutMinutes setting (default 120)
            const settingRow = await prisma.mtmSetting.findFirst({
              where: { organizationId: org.id, key: "autoCheckoutMinutes" },
              select: { value: true },
            })
            const autoCheckoutMinutes =
              settingRow?.value != null ? Number(settingRow.value) : 120

            const cutoff = new Date(now.getTime() - autoCheckoutMinutes * 60 * 1000)

            // Find stale checked-in visits
            const staleVisits = await prisma.mtmVisit.findMany({
              where: {
                organizationId: org.id,
                status: "CHECKED_IN",
                checkInAt: { lt: cutoff },
              },
              include: {
                customer: { select: { name: true } },
              },
            })

            for (const visit of staleVisits) {
              const duration = Math.round(
                (now.getTime() - visit.checkInAt.getTime()) / 60000
              )

              // Auto-checkout the visit
              await prisma.mtmVisit.update({
                where: { id: visit.id },
                data: {
                  status: "CHECKED_OUT",
                  checkOutAt: now,
                  duration,
                },
              })

              // Create LONG_BREAK alert
              await prisma.mtmAlert.create({
                data: {
                  organizationId: org.id,
                  agentId: visit.agentId,
                  type: "LONG_BREAK",
                  category: "WARNING",
                  title: `Auto-checkout: ${visit.customer?.name || "Unknown"}`,
                  description: `Visit exceeded ${duration} minutes (limit: ${autoCheckoutMinutes} min)`,
                  metadata: {
                    visitId: visit.id,
                    customerId: visit.customerId,
                    checkInAt: visit.checkInAt.toISOString(),
                    autoCheckoutMinutes,
                    actualDuration: duration,
                  },
                },
              }).catch(() => {}) // non-blocking

              totalAutoCheckedOut++
            }
          }

          await prisma.$disconnect()
          if (totalAutoCheckedOut > 0) {
            console.log(
              `[MTM Cron] Auto-checked-out ${totalAutoCheckedOut} stale visit(s)`
            )
          }
        } catch (err: any) {
          console.error("[MTM Cron] Error:", err.message)
        }
      }

      setTimeout(() => {
        runMtmAutoCheckout()
        setInterval(runMtmAutoCheckout, MTM_INTERVAL)
      }, MTM_FIRST_RUN)

      console.log("[MTM Cron] Starting auto-checkout — every 15min (first run in 2min)")
    }
  }
}
