import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")?.trim() || ""
  if (q.length < 2) return NextResponse.json({ success: true, data: [] })

  const contains = q
  const mode = "insensitive" as const

  try {
    const [companies, contacts, deals, leads, tasks] = await Promise.all([
      prisma.company.findMany({
        where: { organizationId: orgId, name: { contains, mode } },
        select: { id: true, name: true, industry: true },
        take: 5,
      }),
      prisma.contact.findMany({
        where: { organizationId: orgId, fullName: { contains, mode } },
        select: { id: true, fullName: true, company: { select: { name: true } } },
        take: 5,
      }),
      prisma.deal.findMany({
        where: { organizationId: orgId, name: { contains, mode } },
        select: { id: true, name: true, valueAmount: true, currency: true },
        take: 5,
      }),
      prisma.lead.findMany({
        where: { organizationId: orgId, OR: [{ firstName: { contains, mode } }, { lastName: { contains, mode } }, { company: { contains, mode } }] },
        select: { id: true, firstName: true, lastName: true, company: true },
        take: 5,
      }),
      prisma.task.findMany({
        where: { organizationId: orgId, title: { contains, mode } },
        select: { id: true, title: true, priority: true },
        take: 5,
      }),
    ])

    const results = [
      ...companies.map(c => ({ id: c.id, type: "company" as const, name: c.name, subtitle: c.industry || "", href: `/companies/${c.id}` })),
      ...contacts.map(c => ({ id: c.id, type: "contact" as const, name: c.fullName, subtitle: c.company?.name || "", href: `/contacts/${c.id}` })),
      ...deals.map(d => ({ id: d.id, type: "deal" as const, name: d.name, subtitle: `${d.valueAmount} ${d.currency || "₼"}`, href: `/deals/${d.id}` })),
      ...leads.map(l => ({ id: l.id, type: "lead" as const, name: `${l.firstName} ${l.lastName}`, subtitle: l.company || "", href: `/leads/${l.id}` })),
      ...tasks.map(t => ({ id: t.id, type: "task" as const, name: t.title, subtitle: t.priority, href: `/tasks/${t.id}` })),
    ]

    return NextResponse.json({ success: true, data: results })
  } catch (err) {
    console.error("Search error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
