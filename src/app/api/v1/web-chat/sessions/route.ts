import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const status = searchParams.get("status") || undefined

  const sessions = await prisma.webChatSession.findMany({
    where: { organizationId: orgId, ...(status ? { status } : {}) },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    include: {
      _count: { select: { messages: true } },
    },
  })

  return NextResponse.json({ success: true, data: { sessions } })
}
