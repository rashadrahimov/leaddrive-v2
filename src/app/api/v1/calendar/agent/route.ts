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

  const items: any[] = []

  // 1. TICKETS — with dueDate in range
  try {
    const allTickets = await prisma.ticket.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, subject: true, status: true, priority: true,
        dueDate: true, createdAt: true, assignedToId: true,
      },
      take: 200,
    })

    allTickets.forEach(t => {
      const d = t.dueDate || t.createdAt
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
    })
  } catch (e) {
    // tickets may not have all fields
  }

  // 2. TASKS — assigned to current user with dueDate in range
  try {
    const tasks = await prisma.task.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, title: true, status: true, priority: true,
        dueDate: true, createdAt: true, assignedTo: true,
      },
      take: 200,
    })

    tasks.forEach(t => {
      const d = t.dueDate || t.createdAt
      if (d >= dateFrom && d <= dateTo) {
        items.push({
          id: t.id,
          type: "task",
          title: t.title || "Task",
          date: d.toISOString(),
          hour: d.getHours(),
          status: t.status,
          priority: t.priority,
          url: `/tasks`,
        })
      }
    })
  } catch (e) {}

  // 3. EVENTS — where user is participant or responsible
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
  } catch (e) {}

  // 4. ACTIVITIES — scheduled in range
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
  } catch (e) {}

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
