import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "inbox", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const chat = await prisma.webChatSession.findFirst({
    where: { id, organizationId: orgId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: chat })
}

const updateSchema = z.object({
  status: z.enum(["open", "closed", "escalated"]).optional(),
  assignedUserId: z.string().nullable().optional(),
  aiPaused: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "inbox", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const existing = await prisma.webChatSession.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Auto-pause AI when a human claims the session; resume when released.
  // Explicit aiPaused in the body wins (agent can toggle manually).
  const data: typeof parsed.data = { ...parsed.data }
  if (parsed.data.aiPaused === undefined && parsed.data.assignedUserId !== undefined) {
    data.aiPaused = parsed.data.assignedUserId !== null
  }

  const updated = await prisma.webChatSession.update({
    where: { id },
    data,
  })
  return NextResponse.json({ success: true, data: updated })
}
