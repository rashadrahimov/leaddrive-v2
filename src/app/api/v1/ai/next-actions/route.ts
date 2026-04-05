import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { generateNextBestActions } from "@/lib/ai/next-best-action"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10")

  try {
    const actions = await generateNextBestActions(session.orgId, session.userId, limit)
    return NextResponse.json({ success: true, data: actions })
  } catch (e: any) {
    console.error("Next actions error:", e)
    return NextResponse.json({ error: "Failed to generate actions" }, { status: 500 })
  }
}
