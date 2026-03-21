import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { validateNumeric } from "@/lib/pricing"
import fs from "fs"
import path from "path"

const PRICING_FILE = path.join(process.cwd(), "public", "data", "pricing_data.json")

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = JSON.parse(fs.readFileSync(PRICING_FILE, "utf-8"))
    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: "Pricing data not found" }, { status: 404 })
  }
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = await req.json()
    for (const [cc, cd] of Object.entries(data)) {
      const d = cd as any
      if (d?.categories) {
        for (const [cat, cv] of Object.entries(d.categories)) {
          if (typeof cv === "object" && cv !== null) {
            const o = cv as any
            if ("total" in o) o.total = validateNumeric(o.total, `${cc}.${cat}.total`)
            if (Array.isArray(o.services)) for (const s of o.services) if ("price" in s) s.price = validateNumeric(s.price, `${cc}.${cat}.svc`)
          }
        }
      }
    }
    fs.writeFileSync(PRICING_FILE, JSON.stringify(data, null, 2), "utf-8")
    return NextResponse.json({ success: true, data: { saved: true } })
  } catch { return NextResponse.json({ error: "Failed to save" }, { status: 500 }) }
}
