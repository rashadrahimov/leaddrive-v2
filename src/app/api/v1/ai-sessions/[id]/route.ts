import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// GET — get session with all messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const session = await prisma.aiChatSession.findFirst({
    where: { id, organizationId: orgId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  return NextResponse.json({
    success: true,
    data: {
      session: {
        id: session.id,
        portalUserId: session.portalUserId,
        companyId: session.companyId,
        messagesCount: session.messagesCount,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: session.messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolCalls: m.toolCalls,
          tokenCount: m.tokenCount,
          createdAt: m.createdAt,
        })),
      },
    },
  })
}
