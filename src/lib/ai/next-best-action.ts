import { prisma } from "@/lib/prisma"

export interface NextAction {
  type: "call" | "email" | "meeting" | "task" | "update_stage" | "send_offer"
  title: string
  reason: string
  priority: "high" | "medium" | "low"
  entityType: "deal" | "contact" | "lead" | "company"
  entityId: string
  entityName: string
  suggestedDate?: string
}

function daysSince(date: Date | null | undefined): number {
  if (!date) return 999
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

export async function generateNextBestActions(
  orgId: string,
  userId: string,
  limit: number = 10,
): Promise<NextAction[]> {
  const actions: NextAction[] = []
  const now = new Date()

  // 1. Stale deals — no activity in 7+ days
  const userDeals = await prisma.deal.findMany({
    where: {
      organizationId: orgId,
      stage: { notIn: ["WON", "LOST"] },
      assignedTo: userId,
    },
    select: {
      id: true,
      name: true,
      stage: true,
      expectedClose: true,
      stageChangedAt: true,
      valueAmount: true,
    },
  })

  for (const deal of userDeals) {
    // Get last activity for this deal
    const lastActivity = await prisma.activity.findFirst({
      where: { organizationId: orgId, relatedType: "deal", relatedId: deal.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    const days = daysSince(lastActivity?.createdAt)

    if (days > 14) {
      actions.push({
        type: "call",
        title: `Позвонить по сделке "${deal.name}"`,
        reason: `Нет активности ${days} дней. Сделка может быть потеряна.`,
        priority: "high",
        entityType: "deal",
        entityId: deal.id,
        entityName: deal.name,
      })
    } else if (days > 7) {
      actions.push({
        type: "email",
        title: `Follow-up по "${deal.name}"`,
        reason: `${days} дней без контакта. Отправьте email чтобы поддержать momentum.`,
        priority: "medium",
        entityType: "deal",
        entityId: deal.id,
        entityName: deal.name,
      })
    }

    // Deals with close date this week without recent activity
    if (deal.expectedClose) {
      const daysToClose = Math.floor((new Date(deal.expectedClose).getTime() - now.getTime()) / 86400000)
      if (daysToClose >= 0 && daysToClose <= 7 && days > 3) {
        actions.push({
          type: "call",
          title: `Сделка "${deal.name}" закрывается через ${daysToClose} дн.`,
          reason: `Ожидаемая дата закрытия ${new Date(deal.expectedClose).toLocaleDateString("ru")}. Необходим контакт.`,
          priority: "high",
          entityType: "deal",
          entityId: deal.id,
          entityName: deal.name,
        })
      }
    }
  }

  // 2. Hot leads without follow-up
  const hotLeads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["converted", "lost"] },
      score: { gte: 70 },
    },
    select: { id: true, contactName: true, email: true, score: true },
  })

  for (const lead of hotLeads) {
    const lastActivity = await prisma.activity.findFirst({
      where: { organizationId: orgId, relatedType: "lead", relatedId: lead.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    const days = daysSince(lastActivity?.createdAt)

    if (days > 3) {
      actions.push({
        type: "call",
        title: `Горячий лид: ${lead.contactName}`,
        reason: `Score ${lead.score}/100, но нет контакта ${days} дней. Конвертируйте пока горячий.`,
        priority: "high",
        entityType: "lead",
        entityId: lead.id,
        entityName: lead.contactName || lead.email || "Unknown",
      })
    }
  }

  // 3. Overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      organizationId: orgId,
      assignedTo: userId,
      status: { in: ["pending", "in_progress"] },
      dueDate: { lt: now },
    },
    select: { id: true, title: true, dueDate: true, relatedType: true, relatedId: true },
    take: 5,
  })

  for (const task of overdueTasks) {
    const overdueDays = task.dueDate ? daysSince(task.dueDate) : 0
    actions.push({
      type: "task",
      title: `Просроченная задача: ${task.title}`,
      reason: `Просрочено на ${overdueDays} дн. Выполните или перенесите.`,
      priority: overdueDays > 3 ? "high" : "medium",
      entityType: (task.relatedType as any) || "deal",
      entityId: task.relatedId || task.id,
      entityName: task.title,
    })
  }

  // 4. Tickets approaching SLA
  const urgentTickets = await prisma.ticket.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["new", "in_progress", "waiting"] },
      priority: { in: ["high", "critical"] },
    },
    select: { id: true, subject: true, priority: true, ticketNumber: true, createdAt: true },
    take: 5,
    orderBy: { createdAt: "asc" },
  })

  for (const ticket of urgentTickets) {
    const age = daysSince(ticket.createdAt)
    if (age > 1) {
      actions.push({
        type: "task",
        title: `Тикет ${ticket.ticketNumber}: ${ticket.subject}`,
        reason: `Приоритет ${ticket.priority}, открыт ${age} дн. Требует внимания.`,
        priority: ticket.priority === "critical" ? "high" : "medium",
        entityType: "deal", // fallback
        entityId: ticket.id,
        entityName: ticket.subject,
      })
    }
  }

  // Sort by priority and return top N
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return actions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, limit)
}
