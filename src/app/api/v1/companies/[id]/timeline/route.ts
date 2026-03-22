import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const [activities, deals, tickets] = await Promise.all([
      prisma.activity.findMany({
        where: { companyId: id, organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, subject: true, description: true, createdAt: true, createdBy: true },
      }),
      prisma.deal.findMany({
        where: { companyId: id, organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, name: true, stage: true, valueAmount: true, currency: true, createdAt: true },
      }),
      prisma.ticket.findMany({
        where: { companyId: id, organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, subject: true, status: true, priority: true, createdAt: true },
      }),
    ])

    type TimelineEntry = {
      id: string
      type: "activity" | "deal" | "ticket"
      title: string
      subtitle?: string
      date: string
      meta?: Record<string, any>
    }

    const timeline: TimelineEntry[] = [
      ...activities.map(a => ({
        id: a.id,
        type: "activity" as const,
        title: a.subject || a.type,
        subtitle: a.description || undefined,
        date: a.createdAt.toISOString(),
        meta: { activityType: a.type, createdBy: a.createdBy },
      })),
      ...deals.map(d => ({
        id: d.id,
        type: "deal" as const,
        title: d.name,
        subtitle: `${d.valueAmount.toLocaleString()} ${d.currency}`,
        date: d.createdAt.toISOString(),
        meta: { stage: d.stage },
      })),
      ...tickets.map(t => ({
        id: t.id,
        type: "ticket" as const,
        title: t.subject,
        subtitle: t.status,
        date: t.createdAt.toISOString(),
        meta: { status: t.status, priority: t.priority },
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ success: true, data: { timeline } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
