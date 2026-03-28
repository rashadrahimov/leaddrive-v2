import { prisma } from "@/lib/prisma"

interface WhatsAppConfig {
  accessToken: string
  phoneNumberId: string
  businessAccountId?: string
}

async function getWhatsAppConfig(organizationId?: string): Promise<WhatsAppConfig | null> {
  // Try org-level channel config first
  if (organizationId) {
    const channel = await prisma.channelConfig.findFirst({
      where: {
        organizationId,
        channelType: "whatsapp",
        isActive: true,
      },
    })
    if (channel?.apiKey && channel?.phoneNumber) {
      return {
        accessToken: channel.apiKey,        // Access Token from Meta
        phoneNumberId: channel.phoneNumber,  // Phone Number ID from API Setup
        businessAccountId: channel.webhookUrl || undefined, // Business Account ID stored in webhookUrl field
      }
    }
  }

  // Fallback to env vars
  if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    }
  }

  return null
}

export async function sendWhatsAppMessage({
  to,
  message,
  organizationId,
  contactId,
  sentBy,
}: {
  to: string
  message: string
  organizationId?: string
  contactId?: string
  sentBy?: string
}) {
  const config = await getWhatsAppConfig(organizationId)

  if (!config) {
    console.log(`[WHATSAPP] Not configured | To: ${to} | Message: ${message.slice(0, 50)}...`)

    if (organizationId) {
      await prisma.channelMessage.create({
        data: {
          organizationId,
          direction: "outbound",
          from: "system",
          to,
          body: message,
          status: "failed",
          metadata: { error: "WhatsApp not configured", channel: "whatsapp" },
        },
      }).catch(() => {})
    }

    return { success: false, error: "WhatsApp not configured" }
  }

  try {
    // Clean phone number: remove spaces, dashes, ensure starts with country code
    const cleanPhone = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")

    // Check if we're within the 24h messaging window by looking at last inbound WA message
    let useTemplate = true // Default to template (safe — always works)
    if (organizationId) {
      const lastInbound = await prisma.channelMessage.findFirst({
        where: {
          organizationId,
          direction: "inbound",
          from: { contains: cleanPhone.slice(-10) }, // Match last 10 digits
          metadata: { path: ["channel"], equals: "whatsapp" },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }).catch(() => null)

      if (lastInbound) {
        const hoursSinceLastInbound = (Date.now() - lastInbound.createdAt.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastInbound < 23) { // 23h to be safe (not exactly 24)
          useTemplate = false
          console.log(`[WHATSAPP] Within 24h window (${hoursSinceLastInbound.toFixed(1)}h ago) — sending as text`)
        } else {
          console.log(`[WHATSAPP] Outside 24h window (${hoursSinceLastInbound.toFixed(1)}h ago) — using template`)
        }
      } else {
        console.log(`[WHATSAPP] No inbound message found for ${cleanPhone} — using template`)
      }
    }

    let response: Response
    let data: any
    let usedTemplate = false

    if (useTemplate) {
      // Send via invoice_payment_reminder template (works outside 24h window)
      // Uses named parameters: customer_name, invoice_number, amount, balance_due, due_date
      response = await fetch(
        `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
              name: "invoice_payment_reminder",
              language: { code: "az" },
              components: [
                { type: "body", parameters: [
                  { type: "text", parameter_name: "customer_name", text: message.slice(0, 200) },
                  { type: "text", parameter_name: "invoice_number", text: "-" },
                  { type: "text", parameter_name: "amount", text: "-" },
                  { type: "text", parameter_name: "balance_due", text: "-" },
                  { type: "text", parameter_name: "due_date", text: "-" },
                ] },
              ],
            },
          }),
        }
      )
      data = await response.json()
      usedTemplate = true
    } else {
      // Within 24h window — send as free-form text
      response = await fetch(
        `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: { body: message },
          }),
        }
      )
      data = await response.json()
    }

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`
      console.error(`[WHATSAPP] Send failed:`, errorMsg)

      if (organizationId) {
        await prisma.channelMessage.create({
          data: {
            organizationId,
            direction: "outbound",
            from: config.phoneNumberId,
            to: cleanPhone,
            body: message,
            status: "failed",
            metadata: { error: errorMsg, channel: "whatsapp" },
            contactId,
          },
        }).catch(() => {})
      }

      return { success: false, error: errorMsg }
    }

    const messageId = data?.messages?.[0]?.id

    // Log success
    if (organizationId) {
      await prisma.channelMessage.create({
        data: {
          organizationId,
          direction: "outbound",
          from: config.phoneNumberId,
          to: cleanPhone,
          body: message,
          status: "delivered",
          externalId: messageId,
          metadata: {
            channel: "whatsapp",
            waMessageId: messageId,
            ...(usedTemplate ? { template: "crm_notification_" } : {}),
          },
          contactId,
        },
      }).catch(() => {})
    }

    console.log(`[WHATSAPP] Sent ${usedTemplate ? "via template" : "as text"} to ${cleanPhone} | ID: ${messageId}`)
    return { success: true, messageId }
  } catch (err: any) {
    console.error(`[WHATSAPP] Error:`, err.message)

    if (organizationId) {
      await prisma.channelMessage.create({
        data: {
          organizationId,
          direction: "outbound",
          from: config.phoneNumberId,
          to,
          body: message,
          status: "failed",
          metadata: { error: err.message, channel: "whatsapp" },
          contactId,
        },
      }).catch(() => {})
    }

    return { success: false, error: err.message }
  }
}

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = "en",
  components,
  organizationId,
  contactId,
}: {
  to: string
  templateName: string
  languageCode?: string
  components?: any[]
  organizationId?: string
  contactId?: string
}) {
  const config = await getWhatsAppConfig(organizationId)

  if (!config) {
    return { success: false, error: "WhatsApp not configured" }
  }

  try {
    const cleanPhone = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")

    const body: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    }

    if (components) {
      body.template.components = components
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`
      return { success: false, error: errorMsg }
    }

    const messageId = data?.messages?.[0]?.id

    if (organizationId) {
      await prisma.channelMessage.create({
        data: {
          organizationId,
          direction: "outbound",
          from: config.phoneNumberId,
          to: cleanPhone,
          body: `[Template: ${templateName}]`,
          status: "delivered",
          externalId: messageId,
          metadata: { channel: "whatsapp", template: templateName, waMessageId: messageId },
          contactId,
        },
      }).catch(() => {})
    }

    return { success: true, messageId }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
