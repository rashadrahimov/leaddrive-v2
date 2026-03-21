import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { GROUP_ORDER } from "@/lib/pricing"
import fs from "fs"
import path from "path"

const PRICING_FILE = path.join(process.cwd(), "public", "data", "pricing_data.json")

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = JSON.parse(fs.readFileSync(PRICING_FILE, "utf-8"))
    const s = new Set<string>()
    for (const i of Object.values(data) as Array<{ group: string }>) if (i.group) s.add(i.group)
    const groups = Array.from(s).sort((a, b) => { const ai = GROUP_ORDER.indexOf(a); const bi = GROUP_ORDER.indexOf(b); return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) })
    return NextResponse.json({ success: true, data: groups })
  } catch { return NextResponse.json({ error: "Not found" }, { status: 404 }) }
}
