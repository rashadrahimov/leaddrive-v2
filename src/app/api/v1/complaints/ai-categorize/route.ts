import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { categorizeComplaint } from "@/lib/complaint-ai"

// POST { content, brand?, productCategory? } → { riskLevel, department, complaintType, confidence }
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { content, brand, productCategory } = body as {
    content?: string
    brand?: string
    productCategory?: string
  }
  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 })

  const result = await categorizeComplaint(orgId, { content, brand, productCategory })
  if (!result) {
    return NextResponse.json({ error: "AI unavailable or budget exceeded" }, { status: 429 })
  }
  return NextResponse.json({ data: result })
}
