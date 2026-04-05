import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { calculateChurnRisk } from "@/lib/ai/predictive"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10")

  try {
    const risks = await calculateChurnRisk(session.orgId)
    return NextResponse.json({ success: true, data: risks.slice(0, limit) })
  } catch (e: any) {
    console.error("Churn risk error:", e)
    return NextResponse.json({ error: "Failed to calculate churn risk" }, { status: 500 })
  }
}
