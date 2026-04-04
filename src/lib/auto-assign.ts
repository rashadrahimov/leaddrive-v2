import { prisma } from "@/lib/prisma"

interface AutoAssignResult {
  assigned: boolean
  agentId?: string
  agentName?: string
  queueName?: string
}

/**
 * Auto-assign a ticket to the best available agent based on:
 * 1. Find a TicketQueue matching the ticket's category (via skills overlap)
 * 2. Find agents with matching skills, isAvailable=true, under maxTickets
 * 3. Use queue's assignMethod (least_loaded or round_robin)
 * 4. Update ticket.assignedTo
 */
export async function autoAssignTicket(
  ticketId: string,
  orgId: string,
  category: string
): Promise<AutoAssignResult> {
  try {
    // 1. Find matching queue — queue.skills should contain the ticket category
    const queues = await prisma.ticketQueue.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { priority: "desc" },
    })

    // Try to find a queue whose skills include the ticket category
    let matchedQueue = queues.find((q: any) =>
      (q.skills as string[]).some(
        (s: string) => s.toLowerCase() === category.toLowerCase()
      )
    )

    // Fallback: use the highest-priority queue with no skill filter (catch-all)
    if (!matchedQueue) {
      matchedQueue = queues.find((q: any) => (q.skills as string[]).length === 0)
    }

    // If still no queue, fall back to simple least-loaded across all agents
    if (!matchedQueue) {
      return await fallbackAssign(ticketId, orgId)
    }

    if (!matchedQueue.autoAssign) {
      return { assigned: false }
    }

    // 2. Find available agents with matching skills
    const queueSkills = (matchedQueue.skills as string[]).map((s: string) =>
      s.toLowerCase()
    )

    const allAgents = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        isAvailable: true,
        isActive: true,
        role: { in: ["admin", "manager", "agent"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        skills: true,
        maxTickets: true,
      },
    })

    // Filter agents who have at least one matching skill (or all agents if queue has no skills)
    const matchingAgents =
      queueSkills.length > 0
        ? allAgents.filter((agent: any) =>
            (agent.skills as string[]).some((s: string) =>
              queueSkills.includes(s.toLowerCase())
            )
          )
        : allAgents

    if (matchingAgents.length === 0) {
      return await fallbackAssign(ticketId, orgId)
    }

    // Count open tickets per agent
    const openCounts = await prisma.ticket.groupBy({
      by: ["assignedTo"],
      where: {
        organizationId: orgId,
        status: { notIn: ["closed", "resolved"] },
        assignedTo: { in: matchingAgents.map((a: any) => a.id) },
      },
      _count: { id: true },
    })

    const countMap: Record<string, number> = {}
    for (const row of openCounts) {
      if (row.assignedTo) countMap[row.assignedTo] = row._count.id
    }

    // Filter agents who are under their maxTickets limit
    const availableAgents = matchingAgents.filter(
      (a: any) => (countMap[a.id] || 0) < a.maxTickets
    )

    if (availableAgents.length === 0) {
      return { assigned: false }
    }

    // 3. Select agent based on method
    let selectedAgent: any

    if (matchedQueue.assignMethod === "round_robin") {
      // Round robin: pick the next agent after lastAssignedTo
      const lastIdx = matchedQueue.lastAssignedTo
        ? availableAgents.findIndex(
            (a: any) => a.id === matchedQueue!.lastAssignedTo
          )
        : -1
      const nextIdx = (lastIdx + 1) % availableAgents.length
      selectedAgent = availableAgents[nextIdx]

      // Update lastAssignedTo on the queue
      await prisma.ticketQueue.update({
        where: { id: matchedQueue.id },
        data: { lastAssignedTo: selectedAgent.id },
      })
    } else {
      // least_loaded: sort by open ticket count ascending
      availableAgents.sort(
        (a: any, b: any) => (countMap[a.id] || 0) - (countMap[b.id] || 0)
      )
      selectedAgent = availableAgents[0]
    }

    // 4. Assign ticket
    await prisma.ticket.updateMany({
      where: { id: ticketId, organizationId: orgId },
      data: { assignedTo: selectedAgent.id },
    })

    return {
      assigned: true,
      agentId: selectedAgent.id,
      agentName: selectedAgent.name || selectedAgent.email,
      queueName: matchedQueue.name,
    }
  } catch (e) {
    console.error("[autoAssignTicket] Error:", e)
    return { assigned: false }
  }
}

/**
 * Fallback: simple least-loaded assignment across all active agents
 */
async function fallbackAssign(
  ticketId: string,
  orgId: string
): Promise<AutoAssignResult> {
  const agents = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      isAvailable: true,
      isActive: true,
      role: { in: ["admin", "manager", "agent"] },
    },
    select: { id: true, name: true, email: true, maxTickets: true },
  })

  if (agents.length === 0) return { assigned: false }

  const openCounts = await prisma.ticket.groupBy({
    by: ["assignedTo"],
    where: {
      organizationId: orgId,
      status: { notIn: ["closed", "resolved"] },
      assignedTo: { in: agents.map((a: any) => a.id) },
    },
    _count: { id: true },
  })

  const countMap: Record<string, number> = {}
  for (const row of openCounts) {
    if (row.assignedTo) countMap[row.assignedTo] = row._count.id
  }

  const available = agents.filter(
    (a: any) => (countMap[a.id] || 0) < a.maxTickets
  )
  if (available.length === 0) return { assigned: false }

  available.sort(
    (a: any, b: any) => (countMap[a.id] || 0) - (countMap[b.id] || 0)
  )
  const selected = available[0]

  await prisma.ticket.updateMany({
    where: { id: ticketId, organizationId: orgId },
    data: { assignedTo: selected.id },
  })

  return {
    assigned: true,
    agentId: selected.id,
    agentName: selected.name || selected.email,
  }
}
