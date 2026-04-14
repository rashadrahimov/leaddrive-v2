import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { canRunAiAutomation, calculateAiCost } from "@/lib/ai/budget"
import Anthropic from "@anthropic-ai/sdk"

const FEATURE_NAME = "ai_daily_briefing"

/**
 * AI Daily Briefing Cron Endpoint
 * Called by external cron (e.g. every day at 8:00 AM)
 * Collects CRM metrics and generates an AI-powered daily summary for each org.
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
    let briefingsSent = 0
    let orgsSkipped = 0

    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, features: true, settings: true },
    })

    for (const org of orgs) {
      const guard = await canRunAiAutomation(org.id, FEATURE_NAME)
      if (!guard.proceed) {
        orgsSkipped++
        continue
      }

      const briefing = await collectBriefingData(org.id, now)
      if (!briefing.hasContent) continue

      // Detect org language from settings, default to Russian
      const orgSettings = (org.settings as Record<string, any>) || {}
      const lang = orgSettings.language || orgSettings.locale || "ru"

      const narrative = await generateNarrative(org.id, briefing, lang)
      if (!narrative) continue

      // Send to all admin/manager users in org
      const recipients = await prisma.user.findMany({
        where: {
          organizationId: org.id,
          role: { in: ["admin", "manager"] },
          isActive: true,
        },
        select: { id: true },
      })

      for (const user of recipients) {
        await createNotification({
          organizationId: org.id,
          userId: user.id,
          type: "info",
          title: "Daily AI Briefing",
          message: narrative,
          entityType: "briefing",
        })
      }

      // Slack delivery (if configured)
      if (orgSettings.slackWebhookUrl) {
        try {
          const { sendSlackNotification } = await import("@/lib/slack")
          await sendSlackNotification(orgSettings.slackWebhookUrl, {
            text: `*Daily AI Briefing*\n${narrative}`,
          })
        } catch { /* non-critical */ }
      }

      // Telegram delivery (if configured)
      if (orgSettings.telegramBotToken && orgSettings.telegramChatId) {
        try {
          const tgUrl = `https://api.telegram.org/bot${orgSettings.telegramBotToken}/sendMessage`
          await fetch(tgUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: orgSettings.telegramChatId,
              text: `📊 *Daily AI Briefing*\n\n${narrative}`,
              parse_mode: "Markdown",
            }),
          })
        } catch { /* non-critical */ }
      }

      briefingsSent++
    }

    return NextResponse.json({
      success: true,
      data: { briefingsSent, orgsSkipped, timestamp: now.toISOString() },
    })
  } catch (e) {
    console.error("AI Daily Briefing cron error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

interface BriefingData {
  hasContent: boolean
  staleDeals: { name: string; days: number; value: number }[]
  slaAtRisk: { ticketNumber: string; subject: string; hoursLeft: number }[]
  hotLeads: { name: string; score: number; daysSinceActivity: number }[]
  overdueInvoices: { number: string; company: string; amount: number; daysOverdue: number }[]
  churnRisk: { company: string; score: number; factors: string[] }[]
  newTicketsToday: number
  newDealsToday: number
  wonDealsToday: number
  wonRevenueToday: number
}

async function collectBriefingData(orgId: string, now: Date): Promise<BriefingData> {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // 1. Stale deals (no activity >7 days) — single query with last activity
  const activeDeals = await prisma.deal.findMany({
    where: {
      organizationId: orgId,
      stage: { notIn: ["WON", "LOST"] },
    },
    select: {
      id: true,
      name: true,
      valueAmount: true,
      activities: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  const staleDeals: BriefingData["staleDeals"] = []
  for (const deal of activeDeals) {
    const lastAct = (deal as any).activities?.[0]?.createdAt
    const days = lastAct
      ? Math.floor((now.getTime() - new Date(lastAct).getTime()) / 86400000)
      : 999
    if (days > 7) {
      staleDeals.push({ name: deal.name, days, value: deal.valueAmount || 0 })
    }
  }
  staleDeals.sort((a, b) => b.days - a.days)

  // 2. SLA at risk (tickets with <4h to SLA breach)
  const ticketsAtRisk = await prisma.ticket.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["resolved", "closed"] },
      slaFirstResponseDueAt: { not: null },
      firstResponseAt: null,
    },
    select: { ticketNumber: true, subject: true, slaFirstResponseDueAt: true },
  })

  const slaAtRisk: BriefingData["slaAtRisk"] = []
  for (const t of ticketsAtRisk) {
    if (!t.slaFirstResponseDueAt) continue
    const hoursLeft = (t.slaFirstResponseDueAt.getTime() - now.getTime()) / 3600000
    if (hoursLeft <= 4) {
      slaAtRisk.push({
        ticketNumber: t.ticketNumber || "",
        subject: t.subject,
        hoursLeft: Math.round(hoursLeft * 10) / 10,
      })
    }
  }

  // 3. Hot leads without follow-up — single query with last activity
  const leads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["converted", "lost"] },
      score: { gte: 60 },
    },
    select: {
      id: true,
      contactName: true,
      email: true,
      score: true,
      activities: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  const hotLeads: BriefingData["hotLeads"] = []
  for (const lead of leads) {
    const lastAct = (lead as any).activities?.[0]?.createdAt
    const days = lastAct
      ? Math.floor((now.getTime() - new Date(lastAct).getTime()) / 86400000)
      : 999
    if (days > 3) {
      hotLeads.push({
        name: lead.contactName || lead.email || "Unknown",
        score: lead.score || 0,
        daysSinceActivity: days,
      })
    }
  }

  // 4. Overdue invoices
  const overdueInvoices: BriefingData["overdueInvoices"] = []
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ["sent", "viewed", "overdue"] },
        dueDate: { lt: now },
      },
      select: {
        invoiceNumber: true,
        totalAmount: true,
        dueDate: true,
        company: { select: { name: true } },
      },
      take: 10,
      orderBy: { dueDate: "asc" },
    })
    for (const inv of invoices) {
      const daysOverdue = inv.dueDate
        ? Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000)
        : 0
      overdueInvoices.push({
        number: inv.invoiceNumber || "",
        company: (inv.company as any)?.name || "—",
        amount: inv.totalAmount || 0,
        daysOverdue,
      })
    }
  } catch {
    // invoice relations may vary
  }

  // 5. Churn risk companies
  const companies = await prisma.company.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      activities: { orderBy: { createdAt: "desc" as const }, take: 1, select: { createdAt: true } },
      tickets: { where: { status: { notIn: ["closed", "resolved"] } }, select: { id: true } },
      deals: { where: { stage: { notIn: ["WON", "LOST"] } }, select: { id: true } },
    },
  })

  const churnRisk: BriefingData["churnRisk"] = []
  for (const c of companies) {
    let score = 0
    const factors: string[] = []
    const lastAct = c.activities[0]?.createdAt
    const days = lastAct ? Math.floor((now.getTime() - lastAct.getTime()) / 86400000) : 999

    if (days > 60) { score += 40; factors.push(`No activity ${days}d`) }
    else if (days > 30) { score += 20; factors.push(`No activity ${days}d`) }
    if (c.tickets.length > 3) { score += 20; factors.push(`${c.tickets.length} open tickets`) }
    if (c.deals.length === 0) { score += 15; factors.push("No active deals") }

    if (score > 30) {
      churnRisk.push({ company: c.name, score, factors })
    }
  }
  churnRisk.sort((a, b) => b.score - a.score)

  // 6. Today's activity counters
  const [newTicketsToday, newDealsToday] = await Promise.all([
    prisma.ticket.count({ where: { organizationId: orgId, createdAt: { gte: todayStart } } }),
    prisma.deal.count({ where: { organizationId: orgId, createdAt: { gte: todayStart } } }),
  ])

  const wonDeals = await prisma.deal.findMany({
    where: {
      organizationId: orgId,
      stage: "WON",
      updatedAt: { gte: todayStart },
    },
    select: { valueAmount: true },
  })
  const wonDealsToday = wonDeals.length
  const wonRevenueToday = wonDeals.reduce((s: number, d: any) => s + (d.valueAmount || 0), 0)

  const hasContent =
    staleDeals.length > 0 ||
    slaAtRisk.length > 0 ||
    hotLeads.length > 0 ||
    overdueInvoices.length > 0 ||
    churnRisk.length > 0 ||
    newTicketsToday > 0 ||
    newDealsToday > 0

  return {
    hasContent,
    staleDeals: staleDeals.slice(0, 5),
    slaAtRisk: slaAtRisk.slice(0, 5),
    hotLeads: hotLeads.slice(0, 5),
    overdueInvoices: overdueInvoices.slice(0, 5),
    churnRisk: churnRisk.slice(0, 3),
    newTicketsToday,
    newDealsToday,
    wonDealsToday,
    wonRevenueToday,
  }
}

async function generateNarrative(orgId: string, data: BriefingData, lang: string = "ru"): Promise<string | null> {
  const langMap: Record<string, string> = { ru: "RUSSIAN", en: "ENGLISH", az: "AZERBAIJANI" }
  const langName = langMap[lang] || "RUSSIAN"

  try {
    const anthropic = new Anthropic()

    const dataSnapshot = JSON.stringify({
      staleDeals: data.staleDeals,
      slaAtRisk: data.slaAtRisk,
      hotLeads: data.hotLeads,
      overdueInvoices: data.overdueInvoices,
      churnRisk: data.churnRisk,
      newTicketsToday: data.newTicketsToday,
      newDealsToday: data.newDealsToday,
      wonDealsToday: data.wonDealsToday,
      wonRevenueToday: data.wonRevenueToday,
    })

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are a CRM assistant. Generate a concise daily briefing (max 300 words) in ${langName} language based on this data. Use bullet points. Prioritize urgent items (SLA breaches, high churn risk, overdue invoices). Skip sections with no data. No greetings or sign-offs — just the briefing.\n\nData:\n${dataSnapshot}`,
        },
      ],
    })

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : null

    // Log the interaction
    const inputTokens = response.usage?.input_tokens || 0
    const outputTokens = response.usage?.output_tokens || 0
    const cost = calculateAiCost("claude-haiku-4-5-20251001", inputTokens, outputTokens)

    await prisma.aiInteractionLog.create({
      data: {
        organizationId: orgId,
        userMessage: "daily_briefing_cron",
        aiResponse: (text || "").slice(0, 1000),
        latencyMs: 0,
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        costUsd: cost,
        model: "claude-haiku-4-5-20251001",
        agentType: "system_briefing",
        isCopilot: false,
      },
    })

    return text
  } catch (err) {
    console.error("AI Daily Briefing narrative error:", err)
    return null
  }
}
