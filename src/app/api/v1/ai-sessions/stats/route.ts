import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const sessions = await prisma.aiChatSession.findMany({
      where: { organizationId: orgId },
      include: {
        messages: {
          select: { role: true, tokenCount: true, createdAt: true },
        },
      },
    })

    const totalSessions = sessions.length
    const activeSessions = sessions.filter(s => s.status === "active").length

    // Total messages
    const allMessages = sessions.flatMap(s => s.messages)
    const totalMessages = allMessages.length
    const avgMessagesPerSession = totalSessions > 0 ? Math.round((totalMessages / totalSessions) * 10) / 10 : 0

    // Escalations — sessions with status "escalated"
    const escalations = sessions.filter(s => s.status === "escalated").length

    // Deflection rate — sessions resolved without escalation
    const resolvedSessions = sessions.filter(s => s.status === "resolved" || s.status === "closed").length
    const deflectionRate = totalSessions > 0 ? Math.round((resolvedSessions / totalSessions) * 1000) / 10 : 0

    // FCR — first contact resolution (sessions resolved with <=4 messages)
    const fcrSessions = sessions.filter(s =>
      (s.status === "resolved" || s.status === "closed") && s.messagesCount <= 4
    ).length
    const fcrRate = resolvedSessions > 0 ? Math.round((fcrSessions / resolvedSessions) * 1000) / 10 : 0

    // Average resolution time (minutes) — diff between first and last message
    const resolvedWithMessages = sessions
      .filter(s => (s.status === "resolved" || s.status === "closed") && s.messages.length >= 2)
    let avgResolutionTime = 0
    if (resolvedWithMessages.length > 0) {
      const totalMinutes = resolvedWithMessages.reduce((sum, s) => {
        const msgs = s.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        const first = new Date(msgs[0].createdAt).getTime()
        const last = new Date(msgs[msgs.length - 1].createdAt).getTime()
        return sum + (last - first) / 60000
      }, 0)
      avgResolutionTime = Math.round((totalMinutes / resolvedWithMessages.length) * 10) / 10
    }

    // Average response latency (seconds) — time between user msg and assistant reply
    let totalLatency = 0
    let latencyCount = 0
    for (const s of sessions) {
      const msgs = s.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      for (let i = 1; i < msgs.length; i++) {
        if (msgs[i].role === "assistant" && msgs[i - 1].role === "user") {
          totalLatency += (new Date(msgs[i].createdAt).getTime() - new Date(msgs[i - 1].createdAt).getTime()) / 1000
          latencyCount++
        }
      }
    }
    const avgLatency = latencyCount > 0 ? Math.round((totalLatency / latencyCount) * 10) / 10 : 0

    // Total cost estimate ($0.003 per 1000 tokens as rough estimate)
    const totalTokens = allMessages.reduce((sum, m) => sum + (m.tokenCount || 0), 0)
    const totalCost = Math.round((totalTokens / 1000) * 0.003 * 1000) / 1000

    // CSAT — placeholder (would come from feedback model)
    const csat = 0
    // Quality score — placeholder
    const qualityScore = 0

    return NextResponse.json({
      success: true,
      data: {
        totalSessions,
        activeSessions,
        deflectionRate,
        csat,
        fcrRate,
        avgResolutionTime,
        totalMessages,
        avgMessagesPerSession,
        escalations,
        avgLatency,
        totalCost,
        qualityScore,
        totalTokens,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
