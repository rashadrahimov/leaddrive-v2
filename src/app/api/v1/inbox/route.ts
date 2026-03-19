import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Return empty inbox structure - no channel messages model yet
    // This can be extended when channel messaging is implemented
    return NextResponse.json({
      success: true,
      data: { messages: [], total: 0, page: 1, limit: 50 },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { messages: [], total: 0, page: 1, limit: 50 },
    })
  }
}
