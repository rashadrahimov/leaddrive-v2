import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import fs from "fs"
import path from "path"

const PRICING_FILE = path.join(process.cwd(), "public", "data", "pricing_data.json")

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { code } = await params
  let allData: Record<string, any>
  try { allData = JSON.parse(fs.readFileSync(PRICING_FILE, "utf-8")) } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
  if (!(code in allData)) return NextResponse.json({ error: `Company '${code}' not found` }, { status: 404 })
  delete allData[code]
  fs.writeFileSync(PRICING_FILE, JSON.stringify(allData, null, 2), "utf-8")
  return NextResponse.json({ success: true, data: { deleted: code } })
}
