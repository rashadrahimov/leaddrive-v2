import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { autoAssignTicket } from "@/lib/auto-assign"

const PRIORITY_ORDER = ["low", "medium", "high", "critical"]

/**
 * SLA Escalation Cron Endpoint
 * Called by external cron (e.g. every 5 minutes)
 * Checks for SLA breaches and applies escalation rules
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const cronSecret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace("Bearer ", "")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    let escalatedCount = 0
    let notifiedCount = 0

    // Get all organizations that have escalation rules
    const orgs = await prisma.escalationRule.findMany({
      where: { isActive: true },
      select: { organizationId: true },
      distinct: ["organizationId"],
    })

    for (const { organizationId } of orgs) {
      // Get escalation rules for this org, ordered by level
      const rules = await prisma.escalationRule.findMany({
        where: { organizationId, isActive: true },
        orderBy: { level: "asc" },
      })

      if (rules.length === 0) continue

      // Find tickets with SLA breaches (open tickets only)
      const breachedTickets = await prisma.ticket.findMany({
        where: {
          organizationId,
          status: { notIn: ["resolved", "closed"] },
          OR: [
            // Resolution SLA breached
            { slaDueAt: { lt: now } },
            // First response SLA breached (no first response yet)
            {
              slaFirstResponseDueAt: { lt: now },
              firstResponseAt: null,
            },
          ],
        },
      })

      for (const ticket of breachedTickets) {
        // Determine breach type
        const isFirstResponseBreach =
          ticket.slaFirstResponseDueAt &&
          ticket.slaFirstResponseDueAt < now &&
          !ticket.firstResponseAt

        const isResolutionBreach =
          ticket.slaDueAt && ticket.slaDueAt < now

        // Check resolution warning (within triggerMinutes of breach)
        const isResolutionWarning =
          ticket.slaDueAt &&
          ticket.slaDueAt > now &&
          !isResolutionBreach

        // Find applicable rules
        for (const rule of rules) {
          // Skip if ticket already escalated beyond this level
          if (ticket.escalationLevel >= rule.level) continue

          // Check trigger type match
          let triggered = false
          if (rule.triggerType === "first_response_breach" && isFirstResponseBreach) {
            triggered = true
          } else if (rule.triggerType === "resolution_breach" && isResolutionBreach) {
            // Check if enough time has passed since breach (triggerMinutes after breach)
            if (rule.triggerMinutes > 0 && ticket.slaDueAt) {
              const breachTime = ticket.slaDueAt.getTime()
              const triggerTime = breachTime + rule.triggerMinutes * 60000
              triggered = now.getTime() >= triggerTime
            } else {
              triggered = true
            }
          } else if (rule.triggerType === "resolution_warning" && isResolutionWarning) {
            // Warning: trigger X minutes before SLA breach
            if (ticket.slaDueAt) {
              const warningTime = ticket.slaDueAt.getTime() - rule.triggerMinutes * 60000
              triggered = now.getTime() >= warningTime
            }
          }

          if (!triggered) continue

          // Don't re-escalate too frequently (minimum 30 min between escalations)
          if (
            ticket.lastEscalatedAt &&
            now.getTime() - ticket.lastEscalatedAt.getTime() < 30 * 60000
          ) {
            continue
          }

          // Apply actions
          const actions = (rule.actions as any[]) || []
          for (const action of actions) {
            switch (action.type) {
              case "notify": {
                // Notify target (manager, admin, or specific user)
                const target = action.target || "manager"
                let notifyUsers: { id: string }[] = []

                if (target === "manager" || target === "admin") {
                  notifyUsers = await prisma.user.findMany({
                    where: {
                      organizationId,
                      role: { in: target === "manager" ? ["manager", "admin"] : ["admin"] },
                      isActive: true,
                    },
                    select: { id: true },
                  })
                } else {
                  // Specific user ID
                  notifyUsers = [{ id: target }]
                }

                // Also notify the assigned agent
                if (ticket.assignedTo) {
                  notifyUsers.push({ id: ticket.assignedTo })
                }

                const uniqueUserIds = [...new Set(notifyUsers.map((u) => u.id))]
                for (const userId of uniqueUserIds) {
                  await createNotification({
                    organizationId,
                    userId,
                    type: rule.level >= 3 ? "error" : rule.level >= 2 ? "warning" : "info",
                    title: `SLA Escalation L${rule.level}: ${ticket.ticketNumber}`,
                    message: `Ticket "${ticket.subject}" — ${rule.triggerType.replace(/_/g, " ")}. ${rule.name}`,
                    entityType: "ticket",
                    entityId: ticket.id,
                  })
                  notifiedCount++
                }
                break
              }

              case "increase_priority": {
                const currentIdx = PRIORITY_ORDER.indexOf(ticket.priority)
                if (currentIdx < PRIORITY_ORDER.length - 1) {
                  const newPriority = PRIORITY_ORDER[currentIdx + 1]
                  await prisma.ticket.updateMany({
                    where: { id: ticket.id, organizationId },
                    data: { priority: newPriority },
                  })
                  ticket.priority = newPriority
                }
                break
              }

              case "reassign": {
                // Re-assign via auto-assign (finds a new available agent)
                await autoAssignTicket(ticket.id, organizationId, ticket.category)
                break
              }
            }
          }

          // Update escalation level on ticket
          await prisma.ticket.updateMany({
            where: { id: ticket.id, organizationId },
            data: {
              escalationLevel: rule.level,
              lastEscalatedAt: now,
            },
          })

          escalatedCount++
          break // Only apply one rule per ticket per cron run
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        escalatedCount,
        notifiedCount,
        timestamp: now.toISOString(),
      },
    })
  } catch (e) {
    console.error("SLA Escalation cron error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
