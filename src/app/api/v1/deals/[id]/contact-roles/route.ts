import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const addRoleSchema = z.object({
  contactId: z.string().min(1),
  role: z.string().default("contact_person"),
  influence: z.string().default("Medium"),
  decisionFactor: z.string().default("Ease of Use"),
  loyalty: z.string().default("Neutral"),
  isPrimary: z.boolean().default(false),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const roles = await prisma.dealContactRole.findMany({
      where: { dealId: id },
      orderBy: { createdAt: "asc" },
    })

    const contactIds = roles.map(r => r.contactId)
    const contacts = contactIds.length > 0
      ? await prisma.contact.findMany({
          where: { id: { in: contactIds } },
          select: { id: true, fullName: true, position: true, email: true, phone: true },
        })
      : []
    const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]))

    const enriched = roles.map(r => ({
      ...r,
      contact: contactMap[r.contactId] || { id: r.contactId, fullName: "Unknown", position: null, email: null, phone: null },
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = addRoleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const deal = await prisma.deal.findFirst({ where: { id, organizationId: orgId }, select: { id: true } })
    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 })

    const role = await prisma.dealContactRole.upsert({
      where: { dealId_contactId: { dealId: id, contactId: parsed.data.contactId } },
      create: { dealId: id, ...parsed.data },
      update: { role: parsed.data.role, influence: parsed.data.influence, decisionFactor: parsed.data.decisionFactor, loyalty: parsed.data.loyalty, isPrimary: parsed.data.isPrimary },
    })

    return NextResponse.json({ success: true, data: role })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const { contactId } = await req.json()
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 })

    await prisma.dealContactRole.deleteMany({ where: { dealId: id, contactId } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
