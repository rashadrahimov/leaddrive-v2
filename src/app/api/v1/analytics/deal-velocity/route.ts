import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { dealVelocityAnalysis } from "@/lib/ai/predictive"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const velocity = await dealVelocityAnalysis(session.orgId)
    return NextResponse.json({ success: true, data: velocity })
  } catch (e: any) {
    console.error("Deal velocity error:", e)
    return NextResponse.json({ error: "Failed to analyze deal velocity" }, { status: 500 })
  }
}
