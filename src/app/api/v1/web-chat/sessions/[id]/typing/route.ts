import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { setTyping, getTyping } from "@/lib/web-chat-typing"

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
  setTyping(id, "agent")
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params
  const chat = await prisma.webChatSession.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  })
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const state = getTyping(id)
  return NextResponse.json({
    success: true,
    data: state && state.role === "visitor" ? { typing: true } : { typing: false },
  })
}
