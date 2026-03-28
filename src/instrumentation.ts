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
  }
}
