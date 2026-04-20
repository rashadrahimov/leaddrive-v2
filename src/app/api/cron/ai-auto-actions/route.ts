import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { isAiFeatureEnabled, checkAiBudget } from "@/lib/ai/budget"
import { sendEmail } from "@/lib/email"
import { findTicketsNeedingTriage, generateTriageSuggestion, writeTriageShadowAction } from "@/lib/ai/triage"
import { findTicketsForSentimentCheck, classifyTicketSentiment, writeSentimentShadowAction } from "@/lib/ai/sentiment"
import { findTicketsForKbMatching, matchTicketToKb, writeKbMatchShadowAction } from "@/lib/ai/kb-match"
import { findDuplicateContacts, filterNewDuplicateCandidates, writeDuplicateContactShadowAction } from "@/lib/ai/duplicates"
import { findCreditLimitWarnings, filterNewCreditWarnings, writeCreditLimitShadowAction } from "@/lib/ai/credit"
import { findMentionsForReply, draftSocialReply, writeSocialReplyShadowAction } from "@/lib/ai/social-reply"
import { findViralMentions, filterNewViralCandidates, writeViralShadowAction } from "@/lib/ai/social-viral"

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

      // Deal stage advance (stuck high-probability deals → suggest next stage)
      if (await isAiFeatureEnabled(org.id, "ai_auto_stage_advance")) {
        results.autoStageAdvance = (results.autoStageAdvance || 0) + await runStageAdvance(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_stage_advance_shadow")) {
        results.shadowActions += await runStageAdvance(org.id, now, true)
      }

      // Negative sentiment (AI detects churn signals → escalate to senior)
      if (await isAiFeatureEnabled(org.id, "ai_auto_sentiment")) {
        results.autoSentiment = (results.autoSentiment || 0) + await runSentiment(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_sentiment_shadow")) {
        results.shadowActions += await runSentiment(org.id, now, true)
      }

      // KB auto-close (ticket matches KB article → suggest close with link)
      if (await isAiFeatureEnabled(org.id, "ai_auto_kb_close")) {
        results.autoKbClose = (results.autoKbClose || 0) + await runKbClose(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_kb_close_shadow")) {
        results.shadowActions += await runKbClose(org.id, now, true)
      }

      // Duplicate merge (similar contacts → suggest merge; rule-based, no AI)
      if (await isAiFeatureEnabled(org.id, "ai_auto_duplicate")) {
        results.autoDuplicate = (results.autoDuplicate || 0) + await runDuplicateMerge(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_duplicate_shadow")) {
        results.shadowActions += await runDuplicateMerge(org.id, now, true)
      }

      // Credit limit warning (company outstanding >= 80% of credit limit)
      if (await isAiFeatureEnabled(org.id, "ai_auto_credit_limit")) {
        results.autoCreditLimit = (results.autoCreditLimit || 0) + await runCreditLimit(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_credit_limit_shadow")) {
        results.shadowActions += await runCreditLimit(org.id, now, true)
      }

      // Social Monitoring: AI-drafted reply to negative/neutral mentions
      if (await isAiFeatureEnabled(org.id, "ai_auto_social_reply")) {
        results.autoSocialReply = (results.autoSocialReply || 0) + await runSocialReply(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_social_reply_shadow")) {
        results.shadowActions += await runSocialReply(org.id, now, true)
      }

      // Social Monitoring: Viral/spike alerts
      if (await isAiFeatureEnabled(org.id, "ai_auto_social_viral")) {
        results.autoSocialViral = (results.autoSocialViral || 0) + await runSocialViral(org.id, now, false)
      } else if (await isAiFeatureEnabled(org.id, "ai_auto_social_viral_shadow")) {
        results.shadowActions += await runSocialViral(org.id, now, true)
      }
    }

    // Execute approved shadow actions
    const executedCount = await executeApprovedShadowActions(now)
    results.executedApproved = executedCount

    // Purge stale shadow actions (pending >30d, rejected >14d)
    const purgedCount = await purgeStaleShadowActions(now)
    results.purged = purgedCount

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
          createdBy: null,
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

// ── Deal Stage Advance: stuck high-probability deals → suggest next stage ──

const DEFAULT_STAGE_ORDER = ["LEAD", "QUALIFIED", "DEMO", "PROPOSAL", "NEGOTIATION", "WON"]

function getNextStageFallback(current: string): string | null {
  const idx = DEFAULT_STAGE_ORDER.findIndex(s => s.toLowerCase() === (current || "").toLowerCase())
  if (idx === -1 || idx >= DEFAULT_STAGE_ORDER.length - 1) return null
  return DEFAULT_STAGE_ORDER[idx + 1]
}

async function runStageAdvance(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const stuckSince = new Date(now.getTime() - 14 * 86400000)

  const deals = await prisma.deal.findMany({
    where: {
      organizationId: orgId,
      probability: { gte: 60 },
      stage: { notIn: ["WON", "LOST", "won", "lost"] },
      OR: [
        { stageChangedAt: { lte: stuckSince } },
        { AND: [{ stageChangedAt: null }, { createdAt: { lte: stuckSince } }] },
      ],
    },
    select: {
      id: true, name: true, stage: true, probability: true, valueAmount: true,
      currency: true, stageChangedAt: true, createdAt: true, pipelineId: true,
    },
    take: 25,
  })
  if (deals.length === 0) return 0

  const existing = await prisma.aiShadowAction.findMany({
    where: {
      organizationId: orgId,
      featureName: { in: ["ai_auto_stage_advance", "ai_auto_stage_advance_shadow"] },
      entityType: "deal",
      entityId: { in: deals.map((d: { id: string }) => d.id) },
      OR: [{ approved: null }, { reviewedAt: { gte: new Date(now.getTime() - 7 * 86400000) } }],
    },
    select: { entityId: true },
  })
  const skip = new Set(existing.map((e: { entityId: string }) => e.entityId))

  // Preload pipeline stages once for pipelines in play
  const pipelineIds = Array.from(new Set(deals.map((d: any) => d.pipelineId).filter(Boolean))) as string[]
  const stages = pipelineIds.length > 0
    ? await prisma.pipelineStage.findMany({
        where: { pipelineId: { in: pipelineIds }, isActive: true },
        select: { pipelineId: true, name: true, sortOrder: true, isWon: true, isLost: true },
        orderBy: { sortOrder: "asc" },
      })
    : []
  const stagesByPipeline = new Map<string, typeof stages>()
  for (const s of stages) {
    if (!s.pipelineId) continue
    const list = stagesByPipeline.get(s.pipelineId) || []
    list.push(s)
    stagesByPipeline.set(s.pipelineId, list)
  }

  let count = 0
  for (const deal of deals) {
    if (skip.has(deal.id)) continue

    let nextStage: string | null = null
    if (deal.pipelineId && stagesByPipeline.has(deal.pipelineId)) {
      const list = stagesByPipeline.get(deal.pipelineId)!
      const idx = list.findIndex((s: { name: string }) => s.name === deal.stage)
      if (idx !== -1 && idx < list.length - 1 && !list[idx + 1].isLost) {
        nextStage = list[idx + 1].name
      }
    }
    if (!nextStage) nextStage = getNextStageFallback(deal.stage)
    if (!nextStage) continue

    const stageStart = deal.stageChangedAt || deal.createdAt
    const daysInStage = stageStart ? Math.floor((now.getTime() - stageStart.getTime()) / 86400000) : 0

    await prisma.aiShadowAction.create({
      data: {
        organizationId: orgId,
        featureName: shadow ? "ai_auto_stage_advance_shadow" : "ai_auto_stage_advance",
        entityType: "deal",
        entityId: deal.id,
        actionType: "advance_deal_stage",
        payload: {
          dealName: deal.name,
          currentStage: deal.stage,
          suggestedStage: nextStage,
          probability: deal.probability,
          valueAmount: deal.valueAmount || 0,
          currency: deal.currency || "USD",
          daysInStage,
          reasoning: `Stuck in ${deal.stage} for ${daysInStage} days with ${deal.probability}% probability`,
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

// ── Negative Sentiment Escalation ──

async function runSentiment(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const tickets = await findTicketsForSentimentCheck(orgId, now)
  if (tickets.length === 0) return 0

  const seniors = await prisma.user.findMany({
    where: { organizationId: orgId, role: { in: ["admin", "manager"] }, isActive: true },
    select: { id: true, name: true, email: true },
  })
  if (seniors.length === 0) return 0

  let count = 0
  for (const ticket of tickets) {
    try {
      const sentiment = await classifyTicketSentiment(ticket)
      if (!sentiment) continue
      if (sentiment.level !== "negative_high" || sentiment.confidence < 0.7) continue
      const senior = seniors[count % seniors.length]
      await writeSentimentShadowAction(orgId, ticket, sentiment, senior.id, senior.name || senior.email, now, shadow)
      count++
    } catch (e) {
      console.error(`Sentiment failed for ticket ${ticket.id}:`, e)
    }
  }
  return count
}

// ── KB Auto-Close Suggester ──

async function runKbClose(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const tickets = await findTicketsForKbMatching(orgId, now)
  if (tickets.length === 0) return 0

  let count = 0
  for (const ticket of tickets) {
    try {
      const match = await matchTicketToKb(ticket)
      if (!match) continue
      await writeKbMatchShadowAction(orgId, ticket, match, now, shadow)
      count++
    } catch (e) {
      console.error(`KB match failed for ticket ${ticket.id}:`, e)
    }
  }
  return count
}

// ── Duplicate Contact Merge ──

async function runDuplicateMerge(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const rawCandidates = await findDuplicateContacts(orgId, now)
  const candidates = await filterNewDuplicateCandidates(orgId, rawCandidates, now)
  if (candidates.length === 0) return 0

  let count = 0
  for (const cand of candidates) {
    try {
      await writeDuplicateContactShadowAction(orgId, cand, now, shadow)
      count++
    } catch (e) {
      console.error(`Duplicate merge failed for ${cand.duplicateId}:`, e)
    }
  }
  return count
}

// ── Social: AI-drafted reply to mentions ──

async function runSocialReply(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const mentions = await findMentionsForReply(orgId, now)
  if (mentions.length === 0) return 0

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { name: true, settings: true },
  })
  const orgLang = ((org?.settings as Record<string, any>) || {}).language || "en"
  const orgName = org?.name || ""

  let count = 0
  for (const mention of mentions) {
    try {
      const draft = await draftSocialReply(mention, orgName, orgLang)
      if (!draft) continue
      await writeSocialReplyShadowAction(orgId, mention, draft, now, shadow)
      count++
    } catch (e) {
      console.error(`Social reply failed for mention ${mention.id}:`, e)
    }
  }
  return count
}

// ── Social: Viral/spike alerts ──

async function runSocialViral(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const raw = await findViralMentions(orgId, now)
  const candidates = await filterNewViralCandidates(orgId, raw, now)
  if (candidates.length === 0) return 0

  let count = 0
  for (const c of candidates) {
    try {
      await writeViralShadowAction(orgId, c, now, shadow)
      count++
    } catch (e) {
      console.error(`Viral alert failed for mention ${c.mentionId}:`, e)
    }
  }
  return count
}

// ── Credit Limit Warning ──

async function runCreditLimit(orgId: string, now: Date, shadow: boolean): Promise<number> {
  const rawWarnings = await findCreditLimitWarnings(orgId, now)
  const warnings = await filterNewCreditWarnings(orgId, rawWarnings, now)
  if (warnings.length === 0) return 0

  let count = 0
  for (const w of warnings) {
    try {
      await writeCreditLimitShadowAction(orgId, w, now, shadow)
      count++
    } catch (e) {
      console.error(`Credit warning failed for company ${w.companyId}:`, e)
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
                createdBy: null,
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

        case "escalate_ticket": {
          await prisma.ticket.updateMany({
            where: { id: action.entityId, organizationId: action.organizationId },
            data: {
              assignedTo: payload.suggestedAssigneeId,
              priority: "urgent",
              escalationLevel: 1,
              lastEscalatedAt: now,
            },
          })
          if (payload.suggestedAssigneeId) {
            await createNotification({
              organizationId: action.organizationId,
              userId: payload.suggestedAssigneeId,
              type: "warning",
              title: `⚠️ Negative sentiment: ${payload.ticketNumber || action.entityId}`,
              message: `${payload.reasoning || "AI detected frustrated customer"}. Key phrases: ${(payload.keyPhrases || []).slice(0, 2).join(" · ")}`,
              entityType: "ticket",
              entityId: action.entityId,
            })
          }
          break
        }

        case "kb_close_ticket": {
          if (!payload.articleId || !payload.articleTitle) break
          await prisma.ticketComment.create({
            data: {
              ticketId: action.entityId,
              comment: `📖 Knowledge-base article that answers this: **${payload.articleTitle}**\n\nArticle ID: ${payload.articleId}\n\nIf this solved your issue, great! If not, reply and we'll dig deeper.`,
              isInternal: false,
              userId: null,
            },
          })
          await prisma.ticket.updateMany({
            where: { id: action.entityId, organizationId: action.organizationId },
            data: { status: "resolved", resolvedAt: now, firstResponseAt: now },
          })
          break
        }

        case "post_social_reply": {
          // Safe MVP: don't auto-post to social. Create a task with the AI draft
          // + mark mention as reviewed. Community manager copies the text and
          // clicks the platform's Reply in /social-monitoring.
          const seniors = await prisma.user.findMany({
            where: { organizationId: action.organizationId, role: { in: ["admin", "manager", "sales"] }, isActive: true },
            select: { id: true },
            take: 1,
          })
          const ownerId = seniors[0]?.id
          if (ownerId) {
            const existingTask = await prisma.task.findFirst({
              where: {
                organizationId: action.organizationId,
                relatedType: "social_mention",
                relatedId: action.entityId,
                createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
              },
            })
            if (!existingTask) {
              const handleLabel = payload.authorHandle ? `@${payload.authorHandle}` : (payload.authorName || "author")
              await prisma.task.create({
                data: {
                  organizationId: action.organizationId,
                  title: `Reply to ${handleLabel} on ${payload.platform}`,
                  description: `Tone: ${payload.tone || "informative"}\n\nDraft:\n${payload.replyText || ""}\n\nOriginal: "${payload.mentionExcerpt || ""}"\n\nReasoning: ${payload.reasoning || ""}`,
                  assignedTo: ownerId,
                  dueDate: new Date(now.getTime() + 1 * 86400000),
                  priority: payload.mentionSentiment === "negative" ? "high" : "medium",
                  status: "pending",
                  relatedType: "social_mention",
                  relatedId: action.entityId,
                  createdBy: null,
                },
              })
            }
            await prisma.socialMention.updateMany({
              where: { id: action.entityId, organizationId: action.organizationId },
              data: { status: "reviewed", handledBy: ownerId, handledAt: now },
            })
          }
          break
        }

        case "viral_alert": {
          const seniors = await prisma.user.findMany({
            where: { organizationId: action.organizationId, role: { in: ["admin", "manager"] }, isActive: true },
            select: { id: true },
            take: 3,
          })
          const ownerId = seniors[0]?.id
          if (ownerId) {
            const handleLabel = payload.authorHandle ? `@${payload.authorHandle}` : (payload.authorName || "author")
            const existingTask = await prisma.task.findFirst({
              where: {
                organizationId: action.organizationId,
                relatedType: "social_mention",
                relatedId: action.entityId,
                title: { contains: "viral" },
                createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
              },
            })
            if (!existingTask) {
              await prisma.task.create({
                data: {
                  organizationId: action.organizationId,
                  title: `🚨 Viral mention from ${handleLabel} on ${payload.platform}`,
                  description: `${payload.reason || ""}\n\nExcerpt: "${payload.excerpt || ""}"\n\nReach: ${payload.reach || 0} · Engagement: ${payload.engagement || 0}`,
                  assignedTo: ownerId,
                  dueDate: new Date(now.getTime() + 12 * 3600000),
                  priority: payload.sentiment === "negative" ? "urgent" : "high",
                  status: "pending",
                  relatedType: "social_mention",
                  relatedId: action.entityId,
                  createdBy: null,
                },
              })
            }
            for (const u of seniors) {
              await createNotification({
                organizationId: action.organizationId,
                userId: u.id,
                type: payload.sentiment === "negative" ? "warning" : "info",
                title: `🚨 Viral: ${handleLabel} on ${payload.platform}`,
                message: payload.reason || "",
                entityType: "social_mention",
                entityId: action.entityId,
              })
            }
          }
          break
        }

        case "credit_warning": {
          // Create task for AR/admin team + notify senior users
          const seniors = await prisma.user.findMany({
            where: { organizationId: action.organizationId, role: { in: ["admin", "manager"] }, isActive: true },
            select: { id: true },
            take: 3,
          })
          const owner = seniors[0]?.id
          if (owner) {
            const existingTask = await prisma.task.findFirst({
              where: {
                organizationId: action.organizationId,
                relatedType: "company",
                relatedId: action.entityId,
                title: { contains: "Credit limit" },
                createdAt: { gte: new Date(now.getTime() - 7 * 86400000) },
              },
            })
            if (!existingTask) {
              await prisma.task.create({
                data: {
                  organizationId: action.organizationId,
                  title: `Credit limit warning: ${payload.companyName}`,
                  description: `${payload.reasoning} ${payload.overdueCount > 0 ? `· ${payload.overdueCount} overdue invoices (oldest ${payload.oldestOverdueDays}d).` : ""} Review exposure + decide on hold/collections.`,
                  assignedTo: owner,
                  dueDate: new Date(now.getTime() + 3 * 86400000),
                  priority: "high",
                  status: "pending",
                  relatedType: "company",
                  relatedId: action.entityId,
                  createdBy: null,
                },
              })
            }
            for (const u of seniors) {
              await createNotification({
                organizationId: action.organizationId,
                userId: u.id,
                type: "warning",
                title: `💳 Credit limit: ${payload.companyName}`,
                message: payload.reasoning,
                entityType: "company",
                entityId: action.entityId,
              })
            }
          }
          break
        }

        case "merge_contact": {
          if (!payload.primaryId || !payload.duplicateId) break
          // Reassign relations from duplicate → primary
          await prisma.deal.updateMany({
            where: { organizationId: action.organizationId, contactId: payload.duplicateId },
            data: { contactId: payload.primaryId },
          })
          await prisma.ticket.updateMany({
            where: { organizationId: action.organizationId, contactId: payload.duplicateId },
            data: { contactId: payload.primaryId },
          })
          await prisma.activity.updateMany({
            where: { organizationId: action.organizationId, contactId: payload.duplicateId },
            data: { contactId: payload.primaryId },
          })
          // Soft-delete duplicate
          await prisma.contact.updateMany({
            where: { id: payload.duplicateId, organizationId: action.organizationId },
            data: { isActive: false, tags: { set: ["merged_duplicate"] } },
          })
          break
        }

        case "advance_deal_stage": {
          if (!payload.suggestedStage) break
          await prisma.deal.updateMany({
            where: { id: action.entityId, organizationId: action.organizationId },
            data: { stage: payload.suggestedStage, stageChangedAt: now },
          })
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

        case "send_meeting_recap": {
          if (!payload.customerEmail || !payload.emailSubject || !payload.emailBody) break
          const emailResult = await sendEmail({
            to: payload.customerEmail,
            subject: payload.emailSubject,
            html: payload.emailBody,
            organizationId: action.organizationId,
            contactId: payload.contactId || undefined,
          })
          if (!emailResult.success) {
            throw new Error(`Meeting recap email failed: ${emailResult.error || "unknown"}`)
          }
          // Create tasks for each next-step
          if (Array.isArray(payload.nextSteps) && payload.nextSteps.length > 0) {
            const admins = await prisma.user.findMany({
              where: { organizationId: action.organizationId, role: { in: ["admin", "manager", "sales"] }, isActive: true },
              select: { id: true },
              take: 1,
            })
            const ownerId = admins[0]?.id
            if (ownerId) {
              for (const step of payload.nextSteps.slice(0, 5)) {
                await prisma.task.create({
                  data: {
                    organizationId: action.organizationId,
                    title: String(step).slice(0, 200),
                    description: `From meeting "${payload.meetingTitle}" · ${payload.meetingDate ? new Date(payload.meetingDate).toISOString().slice(0, 10) : ""}`,
                    assignedTo: ownerId,
                    dueDate: new Date(now.getTime() + 5 * 86400000),
                    priority: "medium",
                    status: "pending",
                    relatedType: payload.dealId ? "deal" : "contact",
                    relatedId: payload.dealId || payload.contactId || "",
                    createdBy: null,
                  },
                })
              }
            }
          }
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

// ── Purge stale shadow actions ──

async function purgeStaleShadowActions(now: Date): Promise<number> {
  const pendingCutoff = new Date(now.getTime() - 7 * 86400000)
  const rejectedCutoff = new Date(now.getTime() - 7 * 86400000)

  const [pendingPurge, rejectedPurge] = await Promise.all([
    prisma.aiShadowAction.deleteMany({
      where: { approved: null, createdAt: { lt: pendingCutoff } },
    }),
    prisma.aiShadowAction.deleteMany({
      where: { approved: false, reviewedAt: { lt: rejectedCutoff } },
    }),
  ])

  return pendingPurge.count + rejectedPurge.count
}
