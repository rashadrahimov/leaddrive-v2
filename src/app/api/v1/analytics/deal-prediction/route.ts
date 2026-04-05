import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { predictDealWin } from "@/lib/ai/predictive"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dealId = req.nextUrl.searchParams.get("dealId")
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 })

  try {
    const prediction = await predictDealWin(dealId, session.orgId)
    return NextResponse.json({ success: true, data: prediction })
  } catch (e: any) {
    console.error("Deal prediction error:", e)
    return NextResponse.json({ error: "Failed to predict deal" }, { status: 500 })
  }
}
