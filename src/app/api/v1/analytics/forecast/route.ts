import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { generateRevenueForecast } from "@/lib/ai/predictive"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const months = parseInt(req.nextUrl.searchParams.get("months") || "6")

  try {
    const forecast = await generateRevenueForecast(session.orgId, months)
    return NextResponse.json({ success: true, data: forecast })
  } catch (e: any) {
    console.error("Forecast error:", e)
    return NextResponse.json({ error: "Failed to generate forecast" }, { status: 500 })
  }
}
