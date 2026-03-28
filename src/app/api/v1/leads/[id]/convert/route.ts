import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const convertSchema = z.object({
  dealTitle: z.string().min(1),
  dealStage: z.string().optional(),
  dealValue: z.number().optional(),
  createCompany: z.boolean().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = convertSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const lead = await prisma.lead.findFirst({ where: { id, organizationId: orgId } })
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    if (lead.status === "converted") return NextResponse.json({ error: "Lead already converted" }, { status: 400 })

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create company if companyName exists and requested
      let companyId: string | undefined
      if (lead.companyName && parsed.data.createCompany !== false) {
        const company = await tx.company.create({
          data: {
            organizationId: orgId,
            name: lead.companyName,
            status: "active",
          },
        })
        companyId = company.id
      }

      // 2. Create contact from lead data
      const contact = await tx.contact.create({
        data: {
          organizationId: orgId,
          fullName: lead.contactName,
          email: lead.email || undefined,
          phone: lead.phone || undefined,
          source: lead.source || undefined,
          companyId: companyId,
        },
      })

      // 3. Create deal
      const deal = await tx.deal.create({
        data: {
          organizationId: orgId,
          title: parsed.data.dealTitle,
          stage: parsed.data.dealStage || "QUALIFIED",
          valueAmount: parsed.data.dealValue || lead.estimatedValue || 0,
          contactId: contact.id,
          companyId: companyId,
        },
      })

      // 4. Update lead status to converted
      await tx.lead.update({
        where: { id },
        data: {
          status: "converted",
          convertedAt: new Date(),
        },
      })

      return { company: companyId ? { id: companyId } : null, contact, deal }
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
