import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { applyAdjustments, type PricingAdjustments } from "@/lib/pricing"
import fs from "fs"
import path from "path"

const PRICING_FILE = path.join(process.cwd(), "public", "data", "pricing_data.json")

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const session = await auth()
  const userId = session?.user?.id || null
  const { companies, adjustments, effective_date, notes } = await req.json() as { companies: string[]; adjustments: PricingAdjustments; effective_date: string | null; notes: string }
  if (!companies?.length) return NextResponse.json({ error: "companies required" }, { status: 400 })
  let allData: Record<string, any>
  try { allData = JSON.parse(fs.readFileSync(PRICING_FILE, "utf-8")) } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
  const adjusted = applyAdjustments(allData, adjustments)
  const records = companies.filter((c) => c in allData).map((c) => ({
    organizationId: orgId, companyCode: c, oldPrices: allData[c], newPrices: adjusted[c],
    status: "pending", notes: notes || null, effectiveDate: effective_date || null, createdBy: userId,
  }))
  if (!records.length) return NextResponse.json({ error: "No valid companies" }, { status: 400 })
  const created = await prisma.priceChange.createMany({ data: records })
  return NextResponse.json({ success: true, data: { created: created.count } })
}
