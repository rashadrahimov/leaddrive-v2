import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendEmail, renderTemplate } from "@/lib/email"
import { sendSms, isSmsConfigured } from "@/lib/sms"
import { createNotification } from "@/lib/notifications"
import { trackContactEvent } from "@/lib/contact-events"

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

    // ─────────────────────────────────────────────────────────────────────
    // SMS BRANCH — routes through our sms.ts abstraction (Twilio/Vonage/ATL).
    // Triggered when campaign.type === "sms". Filters contacts/leads by
    // `phone` instead of `email`. Body is campaign.subject or campaign.name.
    // ─────────────────────────────────────────────────────────────────────
    if (campaign.type === "sms") {
      const smsOk = await isSmsConfigured(orgId)
      if (!smsOk) {
        return NextResponse.json(
          { error: "SMS provider not configured. Go to Settings → VoIP to set up Twilio, Vonage or ATL first." },
          { status: 422 }
        )
      }

      const smsBody = campaign.subject || campaign.name
      const mode = campaign.recipientMode || "all"
      let smsRecipients: { id: string; phone: string | null; fullName: string }[]

      if (mode === "manual") {
        const ids = Array.isArray(campaign.recipientIds) ? campaign.recipientIds as string[] : []
        if (ids.length === 0) return NextResponse.json({ error: "No recipients selected" }, { status: 400 })
        smsRecipients = await prisma.contact.findMany({
          where: { organizationId: orgId, id: { in: ids }, phone: { not: null } },
          select: { id: true, phone: true, fullName: true },
        })
      } else if (mode === "segment" && campaign.segmentId) {
        // Reuse segment resolution but require phone instead of email
        const segment = await prisma.contactSegment.findFirst({
          where: { id: campaign.segmentId, organizationId: orgId },
        })
        const where: any = { organizationId: orgId, phone: { not: null } }
        if (segment?.conditions && typeof segment.conditions === "object") {
          const cond = segment.conditions as any
          const AND: any[] = []
          if (cond.source) AND.push({ source: cond.source })
          if (cond.name) AND.push({ fullName: { contains: cond.name, mode: "insensitive" } })
          if (cond.createdAfter) AND.push({ createdAt: { gte: new Date(cond.createdAfter) } })
          if (cond.createdBefore) AND.push({ createdAt: { lte: new Date(cond.createdBefore) } })
          if (AND.length) where.AND = AND
        }
        smsRecipients = await prisma.contact.findMany({
          where,
          select: { id: true, phone: true, fullName: true },
        })
      } else if (mode === "source" && campaign.recipientSource) {
        smsRecipients = await prisma.contact.findMany({
          where: { organizationId: orgId, phone: { not: null }, source: campaign.recipientSource },
          select: { id: true, phone: true, fullName: true },
        })
      } else {
        // "all" / "contacts" / default — contacts with phones
        smsRecipients = await prisma.contact.findMany({
          where: { organizationId: orgId, phone: { not: null } },
          select: { id: true, phone: true, fullName: true },
        })
      }

      const MAX_SMS_BATCH = 1000 // SMS carries real $$ per message — tighter cap than email
      if (smsRecipients.length > MAX_SMS_BATCH) {
        smsRecipients = smsRecipients.slice(0, MAX_SMS_BATCH)
      }

      let sentSms = 0
      const smsErrors: string[] = []
      const deliveredContactIds: string[] = []
      for (const c of smsRecipients) {
        if (!c.phone) continue
        const res = await sendSms({ to: c.phone, message: smsBody, organizationId: orgId })
        if (res.success) {
          sentSms++
          deliveredContactIds.push(c.id)
          trackContactEvent(orgId, c.id, "sms_sent", { campaignId: campaign.id, messageId: res.messageId }).catch(() => {})
        } else if (smsErrors.length < 3) {
          smsErrors.push(`${c.phone}: ${res.error}`)
        }
      }

      // SMS attribution for segmentation (TT §3.3 "SMS kampaniyaları" source).
      // Stamps lastSmsCampaignId + lastSmsAt on every contact that successfully
      // received this blast so segments can filter "received SMS campaign X".
      if (deliveredContactIds.length > 0) {
        await prisma.contact.updateMany({
          where: { organizationId: orgId, id: { in: deliveredContactIds } },
          data: { lastSmsCampaignId: campaign.id, lastSmsAt: new Date() },
        }).catch((e) => console.error("[campaigns/send] SMS attribution update failed:", e))
      }

      await prisma.campaign.update({
        where: { id },
        data: {
          status: sentSms > 0 ? "sent" : "draft",
          sentAt: sentSms > 0 ? new Date() : undefined,
          totalSent: sentSms,
          totalRecipients: smsRecipients.length,
        },
      })

      createNotification({
        organizationId: orgId,
        userId: "",
        type: sentSms > 0 ? "success" : "warning",
        title: `SMS campaign sent: ${campaign.name}`,
        message: `${sentSms} / ${smsRecipients.length} SMS delivered`,
        entityType: "campaign",
        entityId: campaign.id,
      }).catch(() => {})

      return NextResponse.json({
        success: sentSms > 0,
        data: { sent: sentSms, total: smsRecipients.length, errors: smsErrors, channel: "sms" },
      })
    }

    // ─────────────────────────────────────────────────────────────────────
    // EMAIL BRANCH (default, existing behavior)
    // ─────────────────────────────────────────────────────────────────────

    // Load template if specified
    let htmlBody = `<p>${campaign.subject || campaign.name}</p>`
    if (campaign.templateId) {
      const template = await prisma.emailTemplate.findFirst({
        where: { id: campaign.templateId, organizationId: orgId },
      })
      if (template) htmlBody = template.htmlBody
    }

    // Load contacts based on recipientMode
    const mode = campaign.recipientMode || "all"
    let contacts: { id: string; email: string | null; fullName: string }[]

    if (mode === "manual") {
      // Only selected contacts by IDs
      const ids = Array.isArray(campaign.recipientIds) ? campaign.recipientIds as string[] : []
      if (ids.length === 0) {
        return NextResponse.json({ error: "Не выбраны получатели" }, { status: 400 })
      }
      contacts = await prisma.contact.findMany({
        where: { organizationId: orgId, id: { in: ids }, email: { not: null } },
        select: { id: true, email: true, fullName: true },
      })
    } else if (mode === "segment" && campaign.segmentId) {
      // Contacts matching segment conditions
      const segment = await prisma.contactSegment.findFirst({
        where: { id: campaign.segmentId, organizationId: orgId },
      })
      if (segment && segment.conditions && typeof segment.conditions === "object") {
        const cond = segment.conditions as any
        const where: any = { organizationId: orgId, email: { not: null } }
        const AND: any[] = []
        if (cond.company) AND.push({ company: { name: { contains: cond.company, mode: "insensitive" } } })
        if (cond.source) AND.push({ source: cond.source })
        if (cond.role) AND.push({ position: { contains: cond.role, mode: "insensitive" } })
        if (cond.name) AND.push({ fullName: { contains: cond.name, mode: "insensitive" } })
        if (cond.createdAfter) AND.push({ createdAt: { gte: new Date(cond.createdAfter) } })
        if (cond.createdBefore) AND.push({ createdAt: { lte: new Date(cond.createdBefore) } })
        if (cond.hasEmail) AND.push({ email: { not: null }, AND: [{ email: { not: "" } }] })
        if (cond.hasPhone) AND.push({ phone: { not: null }, AND: [{ phone: { not: "" } }] })
        if (AND.length > 0) where.AND = AND
        contacts = await prisma.contact.findMany({
          where,
          select: { id: true, email: true, fullName: true },
        })
      } else {
        // Segment not found or no conditions — fall back to all
        contacts = await prisma.contact.findMany({
          where: { organizationId: orgId, email: { not: null } },
          select: { id: true, email: true, fullName: true },
        })
      }
    } else if (mode === "contacts") {
      // Only contacts (no leads)
      contacts = await prisma.contact.findMany({
        where: { organizationId: orgId, email: { not: null } },
        select: { id: true, email: true, fullName: true },
      })
    } else if (mode === "leads") {
      // Only leads with email
      const leads = await prisma.lead.findMany({
        where: { organizationId: orgId, email: { not: null } },
        select: { id: true, email: true, contactName: true },
      })
      contacts = leads.map((l: any) => ({ id: l.id, email: l.email, fullName: l.contactName }))
    } else if (mode === "source" && campaign.recipientSource) {
      // Contacts from specific source
      contacts = await prisma.contact.findMany({
        where: { organizationId: orgId, email: { not: null }, source: campaign.recipientSource },
        select: { id: true, email: true, fullName: true },
      })
    } else {
      // "all" — all contacts + leads with email
      const allContacts = await prisma.contact.findMany({
        where: { organizationId: orgId, email: { not: null } },
        select: { id: true, email: true, fullName: true },
      })
      const allLeads = await prisma.lead.findMany({
        where: { organizationId: orgId, email: { not: null } },
        select: { id: true, email: true, contactName: true },
      })
      contacts = [...allContacts, ...allLeads.map((l: any) => ({ id: l.id, email: l.email, fullName: l.contactName }))]
    }

    // Limit batch size to prevent mass email abuse
    const MAX_BATCH = 5000
    if (contacts.length > MAX_BATCH) {
      contacts = contacts.slice(0, MAX_BATCH)
    }

    let sentCount = 0
    let unsubscribedCount = 0
    const errors: string[] = []

    // Check if A/B test
    const variants = campaign.isAbTest
      ? await prisma.campaignVariant.findMany({ where: { campaignId: id }, orderBy: { createdAt: "asc" } })
      : []

    if (campaign.isAbTest && variants.length >= 2) {
      // === A/B TEST MODE ===
      const testPct = campaign.testPercentage ?? 20
      const testSize = Math.max(2, Math.floor(contacts.length * testPct / 100))

      // Shuffle contacts
      for (let i = contacts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [contacts[i], contacts[j]] = [contacts[j], contacts[i]]
      }

      const testContacts = contacts.slice(0, testSize)
      const holdoutContacts = contacts.slice(testSize)

      // Distribute test contacts among variants by percentage
      const totalPct = variants.reduce((sum: number, v: any) => sum + v.percentage, 0) || 100
      let offset = 0

      for (const variant of variants) {
        const variantSize = Math.max(1, Math.floor(testContacts.length * variant.percentage / totalPct))
        const variantContacts = testContacts.slice(offset, offset + variantSize)
        offset += variantSize

        // Load variant template if specified
        let variantHtml = htmlBody
        if (variant.htmlBody) {
          variantHtml = variant.htmlBody
        } else if (variant.templateId) {
          const vTemplate = await prisma.emailTemplate.findFirst({ where: { id: variant.templateId, organizationId: orgId } })
          if (vTemplate?.htmlBody) variantHtml = vTemplate.htmlBody
        }

        let variantSentCount = 0
        for (const contact of variantContacts) {
          if (!contact.email) continue
          const rendered = renderTemplate(variantHtml, {
            client_name: contact.fullName,
            manager_name: "LeadDrive Team",
          })
          const result = await sendEmail({
            to: contact.email,
            subject: variant.subject ?? campaign.subject ?? campaign.name,
            html: rendered,
            organizationId: orgId,
            campaignId: campaign.id,
            templateId: variant.templateId ?? campaign.templateId ?? undefined,
            contactId: contact.id,
            variantId: variant.id,
          })
          if (result.success) {
            sentCount++
            variantSentCount++
            trackContactEvent(orgId, contact.id, "email_sent", { campaignId: campaign.id, variantId: variant.id }).catch(() => {})
          } else if (result.error === "Recipient unsubscribed") {
            unsubscribedCount++
          } else if (errors.length < 3) {
            errors.push(`${contact.email}: ${result.error}`)
          }
        }

        // Accurate variant stats — actually-delivered count, not attempted
        await prisma.campaignVariant.update({
          where: { id: variant.id },
          data: { totalSent: variantSentCount },
        })
      }

      // Store holdout contact IDs for later winner send
      const holdoutIds = holdoutContacts.map(c => c.id)

      await prisma.campaign.update({
        where: { id },
        data: {
          status: "ab_testing",
          sentAt: new Date(),
          totalSent: sentCount,
          totalRecipients: contacts.length,
          totalUnsubscribed: unsubscribedCount,
          holdoutIds: holdoutIds,
        },
      })
    } else {
      // === NORMAL MODE ===
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
          organizationId: orgId,
          campaignId: campaign.id,
          templateId: campaign.templateId || undefined,
          contactId: contact.id,
        })
        if (result.success) {
          sentCount++
          trackContactEvent(orgId, contact.id, "email_sent", { campaignId: campaign.id }).catch(() => {})
        } else if (result.error === "Recipient unsubscribed") {
          unsubscribedCount++
        } else if (errors.length < 3) {
          errors.push(`${contact.email}: ${result.error}`)
        }
      }

      // Update campaign stats — totalUnsubscribed reflects how many recipients
      // had a global opt-out and were skipped by sendEmail's compliance layer.
      await prisma.campaign.update({
        where: { id },
        data: {
          status: sentCount > 0 ? "sent" : "draft",
          sentAt: sentCount > 0 ? new Date() : undefined,
          totalSent: sentCount,
          totalRecipients: contacts.length,
          totalUnsubscribed: unsubscribedCount,
        },
      })
    }

    // Notify org about campaign sent
    createNotification({
      organizationId: orgId,
      userId: "",
      type: sentCount > 0 ? "success" : "warning",
      title: `Kampaniya göndərildi: ${campaign.name}`,
      message: `${sentCount} / ${contacts.length} alıcıya göndərildi`,
      entityType: "campaign",
      entityId: campaign.id,
    }).catch(() => {})

    return NextResponse.json({
      success: sentCount > 0,
      data: { sent: sentCount, total: contacts.length, unsubscribed: unsubscribedCount, errors },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
