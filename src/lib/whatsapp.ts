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

    const response = await fetch(
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

    const data = await response.json()

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
          metadata: { channel: "whatsapp", waMessageId: messageId },
          contactId,
        },
      }).catch(() => {})
    }

    console.log(`[WHATSAPP] Sent to ${cleanPhone} | ID: ${messageId}`)
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
