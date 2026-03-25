import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const conv = await prisma.socialConversation.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const messages = await prisma.channelMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  // Mark as read
  await prisma.socialConversation.update({
    where: { id },
    data: { unreadCount: 0 },
  })

  return NextResponse.json({ success: true, data: { ...conv, messages } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const updated = await prisma.socialConversation.updateMany({
    where: { id, organizationId: orgId },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.assignedTo !== undefined && { assignedTo: body.assignedTo }),
      ...(body.contactId !== undefined && { contactId: body.contactId }),
    },
  })

  return NextResponse.json({ success: true, data: { updated: updated.count } })
}
