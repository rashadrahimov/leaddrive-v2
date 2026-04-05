/**
 * Next.js Instrumentation — runs once when the server starts.
 * Used to schedule periodic tasks like journey step processing.
 */
export async function register() {
  // Only run on the server (not during build or in edge runtime)
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
          const orgs = await prisma.organization.findMany({ select: { id: true } })

          for (const org of orgs) {
            const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
            await fetch(`${baseUrl}/api/finance/payment-orders/check-deadlines`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-organization-id": org.id },
            })
          }
          await prisma.$disconnect()
          console.log(`[Finance Cron] Checked deadlines for ${orgs.length} org(s)`)
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
