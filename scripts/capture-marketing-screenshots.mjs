import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "marketing");

const BASE = "https://v2.leaddrivecrm.org";

const pages = [
  { name: "crm-dashboard", path: "/" },
  { name: "deals-pipeline", path: "/deals" },
  { name: "companies-list", path: "/companies" },
  { name: "analytics-profitability", path: "/profitability" },
  { name: "budgeting-pnl", path: "/budgeting" },
  { name: "inbox-channels", path: "/inbox" },
  { name: "marketing-campaigns", path: "/campaigns" },
  { name: "support-tickets", path: "/tickets" },
  { name: "erp-projects", path: "/projects" },
  { name: "platform-settings", path: "/settings/users" },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const page = await context.newPage();

  // Login first
  console.log("Logging in...");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@leaddrive.com");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/", { timeout: 15000 });
  console.log("Logged in!");

  // Force light theme
  await page.evaluate(() => {
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  });

  for (const { name, path: pagePath } of pages) {
    console.log(`Capturing ${name} (${pagePath})...`);
    await page.goto(`${BASE}${pagePath}`, { waitUntil: "networkidle", timeout: 30000 });

    // Force light theme on each page load
    await page.evaluate(() => {
      localStorage.setItem("theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
    });

    // Click theme toggle if still dark
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    if (htmlClass.includes("dark")) {
      const toggle = page.locator('button[title="Toggle theme"]');
      if (await toggle.count() > 0) {
        await toggle.click();
        await page.waitForTimeout(500);
      }
    }

    await page.waitForTimeout(1500); // Let charts/animations render

    const filePath = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: filePath, type: "png" });
    console.log(`  Saved: ${filePath}`);
  }

  await browser.close();
  console.log("Done! All 10 screenshots captured.");
}

run().catch(console.error);
