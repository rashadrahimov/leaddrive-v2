import puppeteer from "puppeteer-core"
import { fileURLToPath } from "url"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "..", "docs", "screenshots")

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const BASE_URL = "http://localhost:3000"
const EMAIL = "demo@leaddrive.com"
const PASSWORD = "Demo1234!"

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  })

  const page = await browser.newPage()

  // Login via NextAuth credentials API directly
  console.log("Logging in via NextAuth API...")

  // 1) Get CSRF token
  await page.goto(`${BASE_URL}/api/auth/csrf`, { waitUntil: "networkidle2", timeout: 15000 })
  const csrfJson = await page.evaluate(() => document.body.innerText)
  const { csrfToken } = JSON.parse(csrfJson)
  console.log("CSRF token obtained")

  // 2) POST credentials to NextAuth
  const loginResult = await page.evaluate(async (csrf, email, pass, baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrf,
        email: email,
        password: pass,
        redirect: "false",
        json: "true",
      }),
      credentials: "include",
    })
    return { status: res.status, url: res.url, ok: res.ok }
  }, csrfToken, EMAIL, PASSWORD, BASE_URL)

  console.log("Login result:", loginResult)

  // 3) Navigate to dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle2", timeout: 15000 })
  await delay(3000)
  console.log("Current URL:", page.url())

  // Check if redirected to login
  if (page.url().includes("login")) {
    console.error("❌ Login failed! Check credentials.")
    await browser.close()
    process.exit(1)
  }

  // Wait for page to fully render
  await delay(3000)

  // Pages to screenshot
  const pages = [
    { name: "dashboard", path: "/dashboard", wait: 5000 },
    { name: "companies", path: "/companies", wait: 3000 },
    { name: "contacts", path: "/contacts", wait: 3000 },
    { name: "deals", path: "/deals", wait: 4000 },
    { name: "leads", path: "/leads", wait: 3000 },
    { name: "tasks", path: "/tasks", wait: 3000 },
    { name: "tickets", path: "/tickets", wait: 3000 },
    { name: "campaigns", path: "/campaigns", wait: 3000 },
    { name: "ai-scoring", path: "/ai-scoring", wait: 3000 },
    { name: "ai-command-center", path: "/ai-command-center", wait: 3000 },
    { name: "knowledge-base", path: "/knowledge-base", wait: 3000 },
    { name: "reports", path: "/reports", wait: 3000 },
    { name: "profitability", path: "/profitability", wait: 3000 },
    { name: "inbox", path: "/inbox", wait: 3000 },
    { name: "segments", path: "/segments", wait: 3000 },
    { name: "journeys", path: "/journeys", wait: 3000 },
    { name: "invoices", path: "/invoices", wait: 3000 },
    { name: "budgeting", path: "/budgeting", wait: 3000 },
    { name: "contracts", path: "/contracts", wait: 3000 },
  ]

  for (const pg of pages) {
    console.log(`Screenshotting: ${pg.name}...`)
    try {
      await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: "networkidle2", timeout: 15000 })
      await delay(pg.wait)
      await page.screenshot({
        path: path.join(outDir, `${pg.name}.png`),
        type: "png",
      })
      console.log(`  ✅ ${pg.name}.png`)
    } catch (err) {
      console.log(`  ❌ ${pg.name}: ${err.message}`)
    }
  }

  await browser.close()
  console.log("\n✅ All screenshots saved to docs/screenshots/")
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

main().catch(console.error)
