import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const sessions = await prisma.aiChatSession.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return NextResponse.json({ success: true, data: { sessions } })
  } catch {
    return NextResponse.json({ success: true, data: { sessions: [] } })
  }
}
