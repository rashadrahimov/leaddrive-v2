import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { isAiFeatureEnabled, checkAiBudget } from "@/lib/ai/budget"
import { sendEmail } from "@/lib/email"
import { findTicketsNeedingTriage, generateTriageSuggestion, writeTriageShadowAction } from "@/lib/ai/triage"

/**
 * AI Auto-Actions Cron Endpoint
 * Called by external cron (e.g. every 10 minutes)
 * Runs all Level 1 automations sequentially.
 * Each action checks its own feature flag.
 * New automations start in shadow mode (write to AiShadowAction, don't execute).
 */
export async function POST(req: NextRequest) {
  const cronSecret =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace("Bearer ", "")
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const results: Record<string, number> = {
      autoAcknowledge: 0,
      autoFollowUp: 0,
      autoPaymentReminder: 0,
      shadowActions: 0,
    }

    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    })

    for (const org of orgs) {
      const budget = await checkAiBudget(org.id)
      if (!budget.allowed) continue

      // Auto-acknowledge tickets (SLA first response)
      if (await isAiFeatureEnabled(org.id, "ai_auto_acknowledge")) {
        results.autoAcknowledge += await runAutoAcknowledge(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_acknowledge_shadow")) {
        results.shadowActions += await runAutoAcknowledge(org.id, now, true)
      }

      // Auto follow-up tasks for stale deals
      if (await isAiFeatureEnabled(org.id, "ai_auto_followup")) {
        results.autoFollowUp += await runAutoFollowUp(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_followup_shadow")) {
        results.shadowActions += await runAutoFollowUp(org.id, now, true)
      }

      // Auto payment reminder enrollment
      if (await isAiFeatureEnabled(org.id, "ai_auto_payment_reminder")) {
        results.autoPaymentReminder += await runAutoPaymentReminder(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_payment_reminder_shadow")) {
        results.shadowActions += await runAutoPaymentReminder(org.id, now, true)
      }

      // Hot lead escalation (score >= 80 → reassign to senior)
      if (await isAiFeatureEnabled(org.id, "ai_auto_hot_lead")) {
        results.autoHotLead = (results.autoHotLead || 0) + await runHotLeadEscalation(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_hot_lead_shadow")) {
        results.shadowActions += await runHotLeadEscalation(org.id, now, true)
      }

      // Auto-triage tickets (new + uncategorised → AI assigns category/priority/tags)
      if (await isAiFeatureEnabled(org.id, "ai_auto_triage")) {
        results.autoTriage = (results.autoTriage || 0) + await runAutoTriage(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_triage_shadow")) {
        results.shadowActions += await runAutoTriage(org.id, now, true)
      }
    }

    // Execute approved shadow actions
    const executedCount = await executeApprovedShadowActions(now)
    results.executedApproved = executedCount

    return NextResponse.json({
      success: true,
      data: { ...results, timestamp: now.toISOString() },
    })
  } catch (e) {
    console.error("AI Auto-Actions cron error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// ── Auto-Acknowledge: template response for tickets approaching SLA first response ──

async function runAutoAcknowledge(orgId: string, now: Date, shadow: boolean): Promise<number> {
  let count = 0

  // Find tickets without first response where >50% of SLA time has elapsed
  const tickets = await prisma.ticket.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["new"] },
      firstResponseAt: null,
      slaFirstResponseDueAt: { not: null },
    },
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      slaFirstResponseDueAt: true,
      createdAt: true,
      contactId: true,
    },
  })

  for (const ticket of tickets) {
    if (!ticket.slaFirstResponseDueAt) continue

    const totalSlaMs = ticket.slaFirstResponseDueAt.getTime() - ticket.createdAt.getTime()
    const elapsedMs = now.getTime() - ticket.createdAt.getTime()
    const percentElapsed = totalSlaMs > 0 ? elapsedMs / totalSlaMs : 0

    // Only auto-acknowledge when >50% of SLA time has passed
    if (percentElapsed < 0.5) continue

    // Calculate remaining hours for the template
    const hoursRemaining = Math.max(0, Math.round((ticket.slaFirstResponseDueAt.getTime() - now.getTime()) / 3600000))

    const templateMessage = `We have received your request ${ticket.ticketNumber}. A specialist will respond within ${hoursRemaining}h. Thank you for your patience.`

    if (shadow) {
      await prisma.aiShadowAction.create({
        data: {
          organizationId: orgId,
          featureName: "ai_auto_acknowledge",
          entityType: "ticket",
          entityId: ticket.id,
          actionType: "send_template",
          payload: {
            ticketNumber: ticket.ticketNumber,
            message: templateMessage,
            hoursRemaining,
            percentElapsed: Math.round(percentElapsed * 100),
          },
        },
      })
    } else {
      // Create a comment on the ticket (public, no userId = system)
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          comment: templateMessage,
          isInternal: false,
          userId: null,
        },
      })

      // Mark first response
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          firstResponseAt: now,
          status: "in_progress",
        },
      })

      // Notify assigned agent
      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { assignedTo: true },
      })
      if (updatedTicket?.assignedTo) {
        await createNotification({
          organizationId: orgId,
          userId: updatedTicket.assignedTo,
          type: "info",
          title: `Auto-acknowledged: ${ticket.ticketNumber}`,
          message: `AI auto-responded to "${ticket.subject}" (SLA ${Math.round(percentElapsed * 100)}% elapsed)`,
          entityType: "ticket",
          entityId: ticket.id,
        })
      }
    }
    count++
  }

  return count
}

// ── Auto Follow-Up: create tasks for stale deals ──

async function runAutoFollowUp(orgId: string, now: Date, shadow: boolean): Promise<number> {
  let count = 0

  const activeDeals = await prisma.deal.findMany({
    where: {
      organizationId: orgId,
      stage: { notIn: ["WON", "LOST"] },
      assignedTo: { not: null },
    },
    select: {
      id: true,
      name: true,
      assignedTo: true,
      company: { select: { name: true } },
    },
  })

  for (const deal of activeDeals) {
    // Check last activity
    const lastActivity = await prisma.activity.findFirst({
      where: { organizationId: orgId, relatedType: "deal", relatedId: deal.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    const daysSinceActivity = lastActivity
      ? Math.floor((now.getTime() - lastActivity.createdAt.getTime()) / 86400000)
      : 999

    if (daysSinceActivity < 7) continue

    // Idempotency: check if we already created a follow-up task this week
    const existingTask = await prisma.task.findFirst({
      where: {
        organizationId: orgId,
        relatedType: "deal",
        relatedId: deal.id,
        title: { startsWith: "Follow up:" },
        createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
      },
    })
    if (existingTask) continue

    const companyName = (deal.company as any)?.name || ""
    const taskTitle = `Follow up: ${deal.name}${companyName ? ` (${companyName})` : ""}`
    const taskDescription = `No activity for ${daysSinceActivity} days. Consider reaching out to keep the deal moving.`

    if (shadow) {
      await prisma.aiShadowAction.create({
        data: {
          organizationId: orgId,
          featureName: "ai_auto_followup",
          entityType: "deal",
          entityId: deal.id,
          actionType: "create_task",
          payload: {
            title: taskTitle,
            description: taskDescription,
            assignedTo: deal.assignedTo,
            daysSinceActivity,
          },
        },
      })
    } else {
      await prisma.task.create({
        data: {
          organizationId: orgId,
          title: taskTitle,
          description: taskDescription,
          assignedTo: deal.assignedTo || "",
          dueDate: new Date(now.getTime() + 2 * 86400000), // due in 2 days
          priority: daysSinceActivity > 14 ? "high" : "medium",
          status: "pending",
          relatedType: "deal",
          relatedId: deal.id,
          createdBy: "system",
        },
      })

      if (deal.assignedTo) {
        await createNotification({
          organizationId: orgId,
          userId: deal.assignedTo,
          type: "info",
          title: `AI: Follow-up needed`,
          message: `"${deal.name}" has no activity for ${daysSinceActivity} days`,
          entityType: "deal",
          entityId: deal.id,
        })
      }
    }
    count++
  }

  return count
}

// ── Auto Payment Reminder: enroll overdue invoices in reminder journey ──

async function runAutoPaymentReminder(orgId: string, now: Date, shadow: boolean): Promise<number> {
  let count = 0

  try {
    // Find overdue invoices (>7 days past due)
    const overdueThreshold = new Date(now.getTime() - 7 * 86400000)
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["sent", "viewed", "overdue"] },
        dueDate: { lt: overdueThreshold },
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        dueDate: true,
        contactId: true,
        companyId: true,
        company: { select: { name: true } },
      },
    })

    for (const invoice of overdueInvoices) {
      if (!invoice.contactId) continue

      const daysOverdue = invoice.dueDate
        ? Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86400000)
        : 0

      // Idempotency: check if we already created a reminder action for this invoice
      const existingShadow = await prisma.aiShadowAction.findFirst({
        where: {
          organizationId: orgId,
          featureName: "ai_auto_payment_reminder",
          entityId: invoice.id,
          createdAt: { gte: new Date(now.getTime() - 30 * 86400000) },
        },
      })
      if (existingShadow) continue

      // Check if contact is already in a payment reminder journey
      const paymentJourneys = await prisma.journey.findMany({
        where: { organizationId: orgId, name: { contains: "payment", mode: "insensitive" } },
        select: { id: true },
      })
      const paymentJourneyIds = paymentJourneys.map(j => j.id)
      if (paymentJourneyIds.length > 0) {
        const existingEnrollment = await prisma.journeyEnrollment.findFirst({
          where: {
            contactId: invoice.contactId,
            journeyId: { in: paymentJourneyIds },
            status: { in: ["active", "paused"] },
          },
        })
        if (existingEnrollment) continue
      }

      const companyName = (invoice.company as any)?.name || ""

      if (shadow) {
        await prisma.aiShadowAction.create({
          data: {
            organizationId: orgId,
            featureName: "ai_auto_payment_reminder",
            entityType: "invoice",
            entityId: invoice.id,
            actionType: "enroll_journey",
            payload: {
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.totalAmount,
              daysOverdue,
              contactId: invoice.contactId,
              companyName,
            },
          },
        })
      } else {
        // Find payment reminder journey
        const journey = await prisma.journey.findFirst({
          where: {
            organizationId: orgId,
            name: { contains: "payment" },
            status: "active",
          },
        })

        if (journey && invoice.contactId) {
          await prisma.journeyEnrollment.create({
            data: {
              organizationId: orgId,
              journeyId: journey.id,
              contactId: invoice.contactId,
              status: "active",
              currentStepIndex: 0,
            },
          })

          // Notify finance team
          const admins = await prisma.user.findMany({
            where: { organizationId: orgId, role: { in: ["admin", "manager"] }, isActive: true },
            select: { id: true },
            take: 3,
          })
          for (const admin of admins) {
            await createNotification({
              organizationId: orgId,
              userId: admin.id,
              type: "info",
              title: `Auto-enrolled: Payment Reminder`,
              message: `Invoice ${invoice.invoiceNumber} (${companyName}) overdue ${daysOverdue}d — enrolled in reminder journey`,
              entityType: "invoice",
              entityId: invoice.id,
            })
          }
        }
      }
      count++
    }
  } catch {
    // invoice/journey models may vary
  }

  return count
}

// ── Hot Lead Escalation: reassign high-score leads to senior managers ──

async function runHotLeadEscalation(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const HOT_SCORE_THRESHOLD = 80

  const hotLeads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      score: { gte: HOT_SCORE_THRESHOLD },
      status: { notIn: ["converted", "lost"] },
    },
    take: 30,
  })
  if (hotLeads.length === 0) return 0

  const seniors = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      role: { in: ["admin", "manager"] },
      isActive: true,
    },
    select: { id: true, name: true, email: true },
  })
  if (seniors.length === 0) return 0

  const seniorIds = new Set(seniors.map((s: { id: string }) => s.id))
  const recent = new Date(now.getTime() - 7 * 86400000)
  const existing = await prisma.aiShadowAction.findMany({
    where: {
      organizationId: orgId,
      featureName: { in: ["ai_auto_hot_lead", "ai_auto_hot_lead_shadow"] },
      entityType: "lead",
      entityId: { in: hotLeads.map((l: { id: string }) => l.id) },
      OR: [{ approved: null }, { reviewedAt: { gte: recent } }],
    },
    select: { entityId: true },
  })
  const skip = new Set(existing.map((e: { entityId: string }) => e.entityId))

  let count = 0
  for (let i = 0; i < hotLeads.length; i++) {
    const lead = hotLeads[i]
    if (skip.has(lead.id)) continue
    if (lead.assignedTo && seniorIds.has(lead.assignedTo)) continue

    const senior = seniors[count % seniors.length]
    await prisma.aiShadowAction.create({
      data: {
        organizationId: orgId,
        featureName: shadow ? "ai_auto_hot_lead_shadow" : "ai_auto_hot_lead",
        entityType: "lead",
        entityId: lead.id,
        actionType: "reassign_lead",
        payload: {
          leadName: lead.contactName,
          companyName: lead.companyName,
          email: lead.email,
          score: lead.score,
          currentAssignee: lead.assignedTo,
          suggestedAssigneeId: senior.id,
          suggestedAssigneeName: senior.name || senior.email,
          reasoning: `Score ${lead.score} exceeded escalation threshold (${HOT_SCORE_THRESHOLD})`,
        },
        approved: shadow ? null : true,
        reviewedAt: shadow ? null : now,
        reviewedBy: shadow ? null : "system",
      },
    })
    count++
  }
  return count
}

// ── Auto-Triage Tickets ──

async function runAutoTriage(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const tickets = await findTicketsNeedingTriage(orgId, now)
  if (tickets.length === 0) return 0

  let count = 0
  for (const ticket of tickets) {
    try {
      const suggestion = await generateTriageSuggestion(ticket)
      if (!suggestion) continue
      await writeTriageShadowAction(orgId, ticket, suggestion, now, shadow)
      count++
    } catch (e) {
      console.error(`Triage failed for ticket ${ticket.id}:`, e)
    }
  }
  return count
}

// ── Execute approved shadow actions ──

async function executeApprovedShadowActions(now: Date): Promise<number> {
  let executed = 0

  const approved = await prisma.aiShadowAction.findMany({
    where: { approved: true, reviewedAt: { not: null } },
    orderBy: { createdAt: "asc" },
    take: 50,
  })

  for (const action of approved) {
    try {
      const payload = action.payload as Record<string, any>

      switch (action.actionType) {
        case "create_task": {
          // Check idempotency: don't create if task already exists
          const existing = await prisma.task.findFirst({
            where: {
              organizationId: action.organizationId,
              relatedType: action.entityType,
              relatedId: action.entityId,
              title: payload.title,
              createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
            },
          })
          if (!existing) {
            await prisma.task.create({
              data: {
                organizationId: action.organizationId,
                title: payload.title,
                description: payload.description || "",
                assignedTo: payload.assignedTo || "",
                dueDate: new Date(now.getTime() + 2 * 86400000),
                priority: payload.daysSinceActivity > 14 ? "high" : "medium",
                status: "pending",
                relatedType: action.entityType,
                relatedId: action.entityId,
                createdBy: "system",
              },
            })
          }
          break
        }

        case "send_template": {
          await prisma.ticketComment.create({
            data: {
              ticketId: action.entityId,
              comment: payload.message,
              isInternal: false,
              userId: null,
            },
          })
          await prisma.ticket.updateMany({
            where: { id: action.entityId, organizationId: action.organizationId },
            data: { firstResponseAt: now, status: "in_progress" },
          })
          break
        }

        case "enroll_journey": {
          if (!payload.contactId) break
          const journey = await prisma.journey.findFirst({
            where: {
              organizationId: action.organizationId,
              name: { contains: "payment" },
              status: "active",
            },
          })
          if (journey) {
            const existing = await prisma.journeyEnrollment.findFirst({
              where: { contactId: payload.contactId, journeyId: journey.id, status: "active" },
            })
            if (!existing) {
              await prisma.journeyEnrollment.create({
                data: {
                  organizationId: action.organizationId,
                  journeyId: journey.id,
                  contactId: payload.contactId,
                  status: "active",
                  currentStepIndex: 0,
                },
              })
            }
          }
          break
        }

        case "triage_ticket": {
          const updateData: any = {}
          if (payload.suggestedCategory) updateData.category = payload.suggestedCategory
          if (payload.suggestedPriority) updateData.priority = payload.suggestedPriority
          if (Array.isArray(payload.suggestedTags) && payload.suggestedTags.length > 0) {
            updateData.tags = payload.suggestedTags
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.ticket.updateMany({
              where: { id: action.entityId, organizationId: action.organizationId },
              data: updateData,
            })
          }
          break
        }

        case "reassign_lead": {
          await prisma.lead.updateMany({
            where: { id: action.entityId, organizationId: action.organizationId },
            data: { assignedTo: payload.suggestedAssigneeId, priority: "high" },
          })
          await createNotification({
            organizationId: action.organizationId,
            userId: payload.suggestedAssigneeId,
            type: "info",
            title: `🔥 Hot lead: ${payload.leadName || "unknown"}`,
            message: `Score ${payload.score}. ${payload.reasoning || "Escalated by AI"}`,
            entityType: "lead",
            entityId: action.entityId,
          })
          break
        }

        case "send_renewal_proposal": {
          if (!payload.contactEmail || !payload.emailSubject || !payload.emailBody) break
          const emailResult = await sendEmail({
            to: payload.contactEmail,
            subject: payload.emailSubject,
            html: payload.emailBody,
            organizationId: action.organizationId,
            contactId: payload.contactId || undefined,
          })
          if (!emailResult.success) {
            throw new Error(`Renewal email failed: ${emailResult.error || "unknown"}`)
          }
          const existingDeal = await prisma.deal.findFirst({
            where: {
              organizationId: action.organizationId,
              companyId: payload.companyId || undefined,
              name: { contains: "Renewal" },
              stage: { notIn: ["WON", "LOST"] },
              createdAt: { gte: new Date(now.getTime() - 60 * 86400000) },
            },
          })
          if (!existingDeal) {
            await prisma.deal.create({
              data: {
                organizationId: action.organizationId,
                companyId: payload.companyId || null,
                contactId: payload.contactId || null,
                name: `Renewal — ${payload.companyName || payload.contractNumber || "contract"}`,
                stage: "PROPOSAL",
                valueAmount: Number(payload.proposedValue) || 0,
                currency: payload.currency || "USD",
                probability: 60,
                expectedClose: payload.endDate ? new Date(payload.endDate) : null,
                notes: `Auto-created from AI renewal proposal. Reasoning: ${payload.reasoning || ""}`,
              },
            })
          }
          break
        }
      }

      // Delete executed action and notify
      await prisma.aiShadowAction.delete({ where: { id: action.id } })

      // Notify admins/managers that the approved action was executed
      const recipients = await prisma.user.findMany({
        where: { organizationId: action.organizationId, role: { in: ["admin", "manager"] }, isActive: true },
        select: { id: true },
        take: 3,
      })
      for (const user of recipients) {
        await createNotification({
          organizationId: action.organizationId,
          userId: user.id,
          type: "success",
          title: `AI action executed: ${action.actionType}`,
          message: `Approved shadow action (${action.featureName}) for ${action.entityType} has been executed`,
          entityType: action.entityType,
          entityId: action.entityId,
        })
      }

      executed++
    } catch (err) {
      console.error(`Failed to execute shadow action ${action.id}:`, err)
      // Mark as failed by rejecting
      await prisma.aiShadowAction.update({
        where: { id: action.id },
        data: { approved: false, reviewedAt: now },
      })
    }
  }

  return executed
}
