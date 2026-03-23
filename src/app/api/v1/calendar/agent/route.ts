import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET /api/v1/calendar/agent?from=2026-03-23&to=2026-03-30
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params required" }, { status: 400 })
  }

  const dateFrom = new Date(from)
  const dateTo = new Date(to)
  dateTo.setHours(23, 59, 59, 999)

  // Today at start of day (for placing open tickets on today)
  const todayStart = new Date()
  todayStart.setHours(9, 0, 0, 0) // Default to 9:00 AM

  const items: any[] = []

  // 1. TICKETS — open tickets show on today, closed/resolved show on their date
  try {
    const allTickets = await prisma.ticket.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, subject: true, status: true, priority: true,
        slaDueAt: true, createdAt: true, assignedTo: true, closedAt: true,
      },
      take: 300,
    })

    allTickets.forEach((t: any) => {
      const isOpen = !["closed", "resolved"].includes(t.status)

      if (isOpen) {
        // Open tickets: show on today if today is in the week range
        if (todayStart >= dateFrom && todayStart <= dateTo) {
          const displayDate = t.slaDueAt || todayStart
          items.push({
            id: t.id,
            type: "ticket",
            title: t.subject || "Ticket",
            date: displayDate.toISOString(),
            hour: new Date(displayDate).getHours() || 9,
            status: t.status,
            priority: t.priority,
            url: `/support/tickets/${t.id}`,
          })
        }
      } else {
        // Closed tickets: show on closedAt or createdAt date
        const d = t.closedAt || t.createdAt
        if (d >= dateFrom && d <= dateTo) {
          items.push({
            id: t.id,
            type: "ticket",
            title: t.subject || "Ticket",
            date: d.toISOString(),
            hour: d.getHours(),
            status: t.status,
            priority: t.priority,
            url: `/support/tickets/${t.id}`,
          })
        }
      }
    })
  } catch (e: any) {
    console.error("[calendar] tickets error:", e?.message)
  }

  // 2. TASKS — open tasks on today, completed on completedAt
  try {
    const tasks = await prisma.task.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, title: true, status: true, priority: true,
        dueDate: true, createdAt: true, assignedTo: true, completedAt: true,
      },
      take: 300,
    })

    tasks.forEach((t: any) => {
      const isOpen = !["completed", "cancelled"].includes(t.status)

      if (isOpen) {
        // Open tasks with dueDate in range
        const d = t.dueDate || todayStart
        if (d >= dateFrom && d <= dateTo) {
          items.push({
            id: t.id,
            type: "task",
            title: t.title || "Task",
            date: d.toISOString(),
            hour: new Date(d).getHours() || 10,
            status: t.status,
            priority: t.priority,
            url: `/tasks`,
          })
        } else if (todayStart >= dateFrom && todayStart <= dateTo && !t.dueDate) {
          // Open task without dueDate: show on today
          items.push({
            id: t.id,
            type: "task",
            title: t.title || "Task",
            date: todayStart.toISOString(),
            hour: 10,
            status: t.status,
            priority: t.priority,
            url: `/tasks`,
          })
        }
      } else {
        const d = t.completedAt || t.dueDate || t.createdAt
        if (d >= dateFrom && d <= dateTo) {
          items.push({
            id: t.id,
            type: "task",
            title: t.title || "Task",
            date: d.toISOString(),
            hour: new Date(d).getHours(),
            status: t.status,
            priority: t.priority,
            url: `/tasks`,
          })
        }
      }
    })
  } catch (e: any) {
    console.error("[calendar] tasks error:", e?.message)
  }

  // 3. EVENTS — startDate in range
  try {
    const events = await prisma.event.findMany({
      where: {
        organizationId: orgId,
        startDate: { gte: dateFrom, lte: dateTo },
      },
      select: {
        id: true, name: true, status: true, type: true,
        startDate: true, endDate: true, location: true, isOnline: true,
      },
      take: 50,
    })

    events.forEach(ev => {
      const d = new Date(ev.startDate)
      const endD = ev.endDate ? new Date(ev.endDate) : null
      items.push({
        id: ev.id,
        type: "event",
        title: ev.name,
        date: d.toISOString(),
        endDate: endD?.toISOString(),
        hour: d.getHours(),
        endHour: endD ? endD.getHours() : d.getHours() + 1,
        status: ev.status,
        location: ev.location,
        isOnline: ev.isOnline,
        eventType: ev.type,
        url: `/events/${ev.id}`,
      })
    })
  } catch (e: any) {
    console.error("[calendar] events error:", e?.message)
  }

  // 4. ACTIVITIES — scheduledAt or createdAt in range
  try {
    const activities = await prisma.activity.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, subject: true, type: true,
        scheduledAt: true, createdAt: true, completedAt: true,
      },
      take: 200,
    })

    activities.forEach(a => {
      const d = a.scheduledAt || a.createdAt
      if (d >= dateFrom && d <= dateTo) {
        items.push({
          id: a.id,
          type: `activity_${a.type || "note"}`,
          title: a.subject || "Activity",
          date: d.toISOString(),
          hour: d.getHours(),
          completed: !!a.completedAt,
        })
      }
    })
  } catch (e: any) {
    console.error("[calendar] activities error:", e?.message)
  }

  // Sort by date
  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return NextResponse.json({
    success: true,
    data: {
      items,
      counts: {
        tickets: items.filter(i => i.type === "ticket").length,
        tasks: items.filter(i => i.type === "task").length,
        events: items.filter(i => i.type === "event").length,
        activities: items.filter(i => i.type.startsWith("activity_")).length,
      },
    },
  })
}
