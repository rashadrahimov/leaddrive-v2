import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { catTotal, validateNumeric } from "@/lib/pricing"
import fs from "fs"
import path from "path"

const PRICING_FILE = path.join(process.cwd(), "public", "data", "pricing_data.json")

export async function PUT(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { code } = await params
  let allData: Record<string, any>
  try { allData = JSON.parse(fs.readFileSync(PRICING_FILE, "utf-8")) } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
  if (!(code in allData)) return NextResponse.json({ error: `Company '${code}' not found` }, { status: 404 })
  const updates = await req.json()
  if (updates.categories) {
    for (const [cat, val] of Object.entries(updates.categories)) {
      if (cat in allData[code].categories) {
        if (typeof val === "object" && val !== null) {
          const v = val as any; if ("total" in v) v.total = validateNumeric(v.total, cat)
          if (Array.isArray(v.services)) for (const s of v.services) if ("price" in s) s.price = validateNumeric(s.price, cat)
          allData[code].categories[cat] = v
        } else {
          const n = validateNumeric(val, cat); const ex = allData[code].categories[cat]
          if (typeof ex === "object" && ex !== null) ex.total = n; else allData[code].categories[cat] = n
        }
      }
    }
    let total = 0; for (const v of Object.values(allData[code].categories)) total += catTotal(v as any)
    allData[code].monthly = Math.round(total * 100) / 100; allData[code].annual = Math.round(total * 12 * 100) / 100
  }
  if (updates.group) allData[code].group = updates.group
  fs.writeFileSync(PRICING_FILE, JSON.stringify(allData, null, 2), "utf-8")
  return NextResponse.json({ success: true, data: allData[code] })
}
