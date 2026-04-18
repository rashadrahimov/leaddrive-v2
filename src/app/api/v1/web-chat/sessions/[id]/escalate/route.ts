import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { escalateWebChatToTicket } from "@/lib/web-chat-escalate"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "inbox", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const chat = await prisma.webChatSession.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  })
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const result = await escalateWebChatToTicket(id, auth.userId)
  if (!result) return NextResponse.json({ error: "Failed" }, { status: 500 })

  const statusCode = result.alreadyEscalated ? 409 : 200
  return NextResponse.json(
    { success: !result.alreadyEscalated, data: result, ...(result.alreadyEscalated ? { error: "Already escalated" } : {}) },
    { status: statusCode },
  )
}
