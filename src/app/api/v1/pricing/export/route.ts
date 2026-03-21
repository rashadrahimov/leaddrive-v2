import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { generateTemplate1, generateTemplate2, generateBudgetPL } from "@/lib/pricing-export"
import type { PricingAdjustments } from "@/lib/pricing"
import fs from "fs"
import path from "path"

const PRICING_FILE = path.join(process.cwd(), "public", "data", "pricing_data.json")
const LEGAL_FILE = path.join(process.cwd(), "public", "data", "company_legal_names.json")

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const body = await req.json()
    const template = body.template || "1"
    const adjustments: PricingAdjustments | null = body.adjustments || null
    const effectiveDate: string | null = body.effective_date || null
    const data = JSON.parse(fs.readFileSync(PRICING_FILE, "utf-8"))
    let legal: Record<string, string> = {}
    try { legal = JSON.parse(fs.readFileSync(LEGAL_FILE, "utf-8")) } catch {}
    let buffer: Buffer; let filename: string
    if (template === "2") { buffer = await generateTemplate2(data, legal, adjustments, effectiveDate); filename = "SALES_Report.xlsx" }
    else if (template === "budget" || template === "3") { buffer = await generateBudgetPL(data, legal, adjustments, effectiveDate); filename = "Budget_PL.xlsx" }
    else { buffer = await generateTemplate1(data, legal, adjustments, effectiveDate); filename = "SALES_2026.xlsx" }
    return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"` } })
  } catch (e) { console.error("Export failed:", e); return NextResponse.json({ error: "Export failed" }, { status: 500 }) }
}
