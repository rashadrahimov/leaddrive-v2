import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendEmail, renderTemplate } from "@/lib/email"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    if (campaign.status === "sent") return NextResponse.json({ error: "Campaign already sent" }, { status: 400 })

    // Load template if specified
    let htmlBody = `<p>${campaign.subject || campaign.name}</p>`
    if (campaign.templateId) {
      const template = await prisma.emailTemplate.findFirst({
        where: { id: campaign.templateId, organizationId: orgId },
      })
      if (template) htmlBody = template.htmlBody
    }

    // Load contacts from segment or all contacts
    let contacts: { email: string | null; fullName: string }[]
    if (campaign.segmentId) {
      // For now, load all contacts (segment filtering can be added later)
      contacts = await prisma.contact.findMany({
        where: { organizationId: orgId, email: { not: null } },
        select: { email: true, fullName: true },
      })
    } else {
      contacts = await prisma.contact.findMany({
        where: { organizationId: orgId, email: { not: null } },
        select: { email: true, fullName: true },
      })
    }

    let sentCount = 0
    for (const contact of contacts) {
      if (!contact.email) continue
      const rendered = renderTemplate(htmlBody, {
        client_name: contact.fullName,
        manager_name: "LeadDrive Team",
      })
      const result = await sendEmail({
        to: contact.email,
        subject: campaign.subject || campaign.name,
        html: rendered,
      })
      if (result.success) sentCount++
    }

    // Update campaign stats
    await prisma.campaign.update({
      where: { id },
      data: {
        status: "sent",
        sentAt: new Date(),
        totalSent: sentCount,
        totalRecipients: contacts.length,
      },
    })

    return NextResponse.json({
      success: true,
      data: { sent: sentCount, total: contacts.length },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
