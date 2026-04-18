import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const { searchParams } = new URL(req.url)
  const since = searchParams.get("since")
  const sinceDate = since ? new Date(since) : null

  const whereOpen = {
    organizationId: orgId,
    status: { in: ["open", "escalated"] },
    ...(sinceDate ? { lastMessageAt: { gt: sinceDate } } : {}),
  }

  const count = await prisma.webChatSession.count({ where: whereOpen })
  return NextResponse.json({ success: true, data: { count } })
}
