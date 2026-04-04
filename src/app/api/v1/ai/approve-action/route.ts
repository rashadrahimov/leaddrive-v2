import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/api-auth"
import { prisma, logAudit } from "@/lib/prisma"
import { executeTool } from "@/lib/ai/tool-executor"

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { orgId, userId } = session

  const { actionId, decision } = await req.json()
  if (!actionId || !decision) {
    return NextResponse.json({ error: "actionId and decision required" }, { status: 400 })
  }
  if (!["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 })
  }

  const pending = await prisma.aiPendingAction.findFirst({
    where: { id: actionId, organizationId: orgId, status: "pending" },
  })
  if (!pending) {
    return NextResponse.json({ error: "Pending action not found or already resolved" }, { status: 404 })
  }

  // Check expiry
  if (new Date() > pending.expiresAt) {
    await prisma.aiPendingAction.update({
      where: { id: actionId },
      data: { status: "expired" },
    })
    return NextResponse.json({ error: "Action has expired" }, { status: 410 })
  }

  if (decision === "reject") {
    await prisma.aiPendingAction.update({
      where: { id: actionId },
      data: { status: "rejected", resolvedAt: new Date(), resolvedBy: userId },
    })
    logAudit(orgId, "ai_action_rejected", pending.toolName, actionId, `AI action rejected: ${pending.toolName}`)
    return NextResponse.json({ success: true, data: { status: "rejected" } })
  }

  // Approve and execute
  const toolInput = pending.toolInput as Record<string, any>
  const result = await executeTool(pending.toolName, toolInput, orgId, pending.userId, true)

  await prisma.aiPendingAction.update({
    where: { id: actionId },
    data: {
      status: result.success ? "approved" : "pending",
      resolvedAt: result.success ? new Date() : undefined,
      resolvedBy: result.success ? userId : undefined,
    },
  })

  logAudit(orgId, "ai_action_approved", pending.toolName, actionId, `AI action approved: ${pending.toolName}`)

  return NextResponse.json({
    success: result.success,
    data: {
      status: result.success ? "approved" : "failed",
      result: result.data,
      error: result.error,
    },
  })
}
