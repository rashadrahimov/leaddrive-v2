import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════════════
// WhatsApp Cloud API — multi-tenant send library
//
// Per-tenant credentials live in ChannelConfig (accessToken, phoneNumberId,
// businessAccountId, verifyToken, appSecret). The env-var fallback that used
// to route every tenant through LeadDrive's WABA has been removed — if a
// tenant has no whatsapp ChannelConfig row, sending returns null and the
// caller handles the "not configured" case explicitly.
//
// Templates come from the whatsapp_templates table, which is populated by
// syncTemplatesFromMeta(). There are no hardcoded template names anywhere.
// ═══════════════════════════════════════════════════════════════════════

const GRAPH_API_VERSION = "v21.0"
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// 24h customer service window in WhatsApp policy. We use 23h to stay safely
// inside the window even with slight clock skew between us and Meta.
const SESSION_WINDOW_HOURS = 23

export interface WhatsAppConfig {
  id: string
  organizationId: string
  accessToken: string
  phoneNumberId: string
  businessAccountId: string | null
  verifyToken: string | null
  appSecret: string | null
  displayName: string | null
}

/**
 * Resolve per-tenant WhatsApp config from ChannelConfig. Reads new columns
 * first with legacy aliases as fallback for the transition period. Returns
 * null when the tenant has no whatsapp row or the essential creds are
 * missing — callers must treat null as "not configured".
 */
export async function resolveWhatsAppConfig(organizationId: string): Promise<WhatsAppConfig | null> {
  if (!organizationId) return null

  const row = await prisma.channelConfig.findFirst({
    where: { organizationId, channelType: "whatsapp", isActive: true },
  })
  if (!row) return null

  // New columns first; fall back to legacy names for un-migrated rows.
  const accessToken   = row.accessToken   || row.apiKey      || null
  const phoneNumberId = row.phoneNumberId || row.phoneNumber || null
  const businessAccountId = row.businessAccountId || row.webhookUrl || null

  if (!accessToken || !phoneNumberId) return null

  return {
    id: row.id,
    organizationId,
    accessToken,
    phoneNumberId,
    businessAccountId,
    verifyToken: row.verifyToken || null,
    appSecret: row.appSecret || null,
    displayName: row.displayName || null,
  }
}

/**
 * Approved templates for a tenant. Use in UI pickers and send endpoints.
 */
export async function listApprovedTemplates(
  organizationId: string,
  opts: { language?: string; category?: string } = {},
) {
  return prisma.whatsAppTemplate.findMany({
    where: {
      organizationId,
      status: "APPROVED",
      ...(opts.language ? { language: opts.language } : {}),
      ...(opts.category ? { category: opts.category } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  })
}

/**
 * Helper to check whether we're inside the 24h customer service window.
 * Looks for the most recent inbound WhatsApp message from the same phone.
 */
async function insideSessionWindow(
  organizationId: string,
  toPhone: string,
): Promise<boolean> {
  const clean = toPhone.replace(/[^0-9]/g, "").slice(-10)
  const inbound = await prisma.channelMessage
    .findFirst({
      where: {
        organizationId,
        direction: "inbound",
        channelType: "whatsapp",
        OR: [
          { from: { contains: clean } },
          { metadata: { path: ["waPhone"], string_contains: clean } as any },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    .catch(() => null)

  if (!inbound) return false
  const hours = (Date.now() - inbound.createdAt.getTime()) / (1000 * 60 * 60)
  return hours < SESSION_WINDOW_HOURS
}

// ─── Free-form text send ─────────────────────────────────────────────
//
// Allowed ONLY when the tenant is inside the 24h customer service window
// with the recipient. Outside that window Meta requires a pre-approved
// template — see sendWhatsAppTemplate.
export async function sendWhatsAppText({
  to,
  body,
  organizationId,
  contactId,
}: {
  to: string
  body: string
  organizationId: string
  contactId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string; hint?: string }> {
  const config = await resolveWhatsAppConfig(organizationId)
  if (!config) {
    return { success: false, error: "WhatsApp not configured for this tenant" }
  }

  const cleanPhone = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")
  const windowOk = await insideSessionWindow(organizationId, cleanPhone)
  if (!windowOk) {
    return {
      success: false,
      error: "outside_window_no_template",
      hint: "This recipient hasn't messaged you in 23h. Use sendWhatsAppTemplate with an approved template.",
    }
  }

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${config.phoneNumberId}/messages`, {
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
        text: { body },
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      const err = data?.error?.message || `HTTP ${res.status}`
      await logMessage(organizationId, config, cleanPhone, body, "failed", contactId, { error: err })
      return { success: false, error: err }
    }

    const messageId = data?.messages?.[0]?.id
    await logMessage(organizationId, config, cleanPhone, body, "delivered", contactId, { waMessageId: messageId })
    return { success: true, messageId }
  } catch (err: any) {
    const msg = err?.message || "network error"
    await logMessage(organizationId, config, cleanPhone, body, "failed", contactId, { error: msg })
    return { success: false, error: msg }
  }
}

// ─── Template send ───────────────────────────────────────────────────
//
// Required for outbound messages outside the 24h window AND for any first-
// contact outreach. Template must be APPROVED in Meta Business Manager and
// present in the whatsapp_templates table (populated via syncTemplatesFromMeta).
export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  variables,
  organizationId,
  contactId,
}: {
  to: string
  templateName: string
  languageCode?: string  // if omitted we resolve from the stored template
  variables?: Record<string, string> | string[]
  organizationId: string
  contactId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await resolveWhatsAppConfig(organizationId)
  if (!config) {
    return { success: false, error: "WhatsApp not configured for this tenant" }
  }

  // Resolve template spec from DB. If languageCode is given we match on it,
  // otherwise we take the first APPROVED match by name. When the template
  // isn't in our DB we still try to send — Meta will reject if the tenant's
  // WABA doesn't actually have it approved. This way the built-in
  // `hello_world` sample works before the first templates-sync, and we
  // avoid a chicken-and-egg problem on first-time credential validation.
  const template = await prisma.whatsAppTemplate.findFirst({
    where: {
      organizationId,
      name: templateName,
      status: "APPROVED",
      ...(languageCode ? { language: languageCode } : {}),
    },
  })

  const lang = languageCode || template?.language || "en_US"
  const cleanPhone = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")

  // Build components from stored variables + caller-supplied values.
  // Stored variables are either named parameters (if Meta returned them) or
  // positional {{1}}..{{N}}. We support both shapes of `variables` input.
  const bodyParams: any[] = []
  if (variables) {
    if (Array.isArray(variables)) {
      for (const val of variables) bodyParams.push({ type: "text", text: String(val) })
    } else if (template) {
      for (const key of template.variables) {
        const val = variables[key] ?? ""
        const isPositional = /^\d+$/.test(key)
        bodyParams.push(
          isPositional
            ? { type: "text", text: String(val) }
            : { type: "text", parameter_name: key, text: String(val) },
        )
      }
    }
  }

  const components = bodyParams.length > 0
    ? [{ type: "body", parameters: bodyParams }]
    : []

  try {
    const res = await fetch(`${GRAPH_API_BASE}/${config.phoneNumberId}/messages`, {
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
          name: templateName,
          language: { code: lang },
          ...(components.length ? { components } : {}),
        },
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      const err = data?.error?.message || `HTTP ${res.status}`
      await logMessage(organizationId, config, cleanPhone, `[template:${templateName}]`, "failed", contactId, { error: err, template: templateName })
      return { success: false, error: err }
    }

    const messageId = data?.messages?.[0]?.id
    await logMessage(organizationId, config, cleanPhone, `[template:${templateName}]`, "delivered", contactId, {
      waMessageId: messageId, template: templateName, language: lang,
    })
    return { success: true, messageId }
  } catch (err: any) {
    const msg = err?.message || "network error"
    await logMessage(organizationId, config, cleanPhone, `[template:${templateName}]`, "failed", contactId, { error: msg, template: templateName })
    return { success: false, error: msg }
  }
}

// ─── Facade for existing callsites ───────────────────────────────────
//
// Kept for backward compatibility with the 8 callsites documented in the
// phase-1 audit. If `templateName` is passed we send via template. Otherwise
// we try free-form; outside the session window we return a structured error
// (no more hardcoded "invoice_payment_reminder" fallback).
export async function sendWhatsAppMessage({
  to,
  message,
  organizationId,
  contactId,
  templateName,
  templateLanguage,
  templateVariables,
  forceText,
}: {
  to: string
  message: string
  organizationId?: string
  contactId?: string
  sentBy?: string
  templateName?: string
  templateLanguage?: string
  templateVariables?: Record<string, string> | string[]
  forceText?: boolean
}) {
  if (!organizationId) {
    return { success: false, error: "organizationId required" }
  }

  if (templateName) {
    return sendWhatsAppTemplate({
      to,
      templateName,
      languageCode: templateLanguage,
      variables: templateVariables,
      organizationId,
      contactId,
    })
  }

  // forceText=true callers bypass the window check (they already know).
  if (forceText) {
    const config = await resolveWhatsAppConfig(organizationId)
    if (!config) return { success: false, error: "WhatsApp not configured for this tenant" }
    const cleanPhone = to.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")
    try {
      const res = await fetch(`${GRAPH_API_BASE}/${config.phoneNumberId}/messages`, {
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
      })
      const data = await res.json()
      if (!res.ok) {
        const err = data?.error?.message || `HTTP ${res.status}`
        await logMessage(organizationId, config, cleanPhone, message, "failed", contactId, { error: err })
        return { success: false, error: err }
      }
      const messageId = data?.messages?.[0]?.id
      await logMessage(organizationId, config, cleanPhone, message, "delivered", contactId, { waMessageId: messageId })
      return { success: true, messageId }
    } catch (err: any) {
      const msg = err?.message || "network error"
      await logMessage(organizationId, config, cleanPhone, message, "failed", contactId, { error: msg })
      return { success: false, error: msg }
    }
  }

  return sendWhatsAppText({ to, body: message, organizationId, contactId })
}

// ─── Template sync with Meta ────────────────────────────────────────
//
// Fetches approved templates from Graph API and upserts them into the
// whatsapp_templates table. Called from the admin UI "Sync" button.
export async function syncTemplatesFromMeta(organizationId: string): Promise<{
  success: boolean
  synced: number
  error?: string
}> {
  const config = await resolveWhatsAppConfig(organizationId)
  if (!config) {
    return { success: false, synced: 0, error: "WhatsApp not configured" }
  }
  if (!config.businessAccountId) {
    return { success: false, synced: 0, error: "businessAccountId missing — configure it in /settings/channels/whatsapp" }
  }

  let totalSynced = 0
  let nextUrl: string | null = `${GRAPH_API_BASE}/${config.businessAccountId}/message_templates?fields=name,language,status,category,components&limit=100`

  try {
    while (nextUrl) {
      const res: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
      })
      const data: any = await res.json()
      if (!res.ok) {
        return { success: false, synced: totalSynced, error: data?.error?.message || `HTTP ${res.status}` }
      }

      for (const t of (data.data || []) as any[]) {
        const { variables, bodyText, headerType, headerText, footerText, buttons } = extractTemplateParts(t.components || [])

        await prisma.whatsAppTemplate.upsert({
          where: {
            organizationId_name_language: {
              organizationId,
              name: t.name,
              language: t.language,
            },
          },
          update: {
            channelConfigId: config.id,
            status: t.status || "PENDING",
            category: t.category || "UTILITY",
            bodyText, headerType, headerText, footerText,
            buttons, variables,
            rawMeta: t,
            lastSyncAt: new Date(),
          },
          create: {
            organizationId,
            channelConfigId: config.id,
            metaTemplateId: t.id?.toString() || null,
            name: t.name,
            language: t.language,
            status: t.status || "PENDING",
            category: t.category || "UTILITY",
            bodyText, headerType, headerText, footerText,
            buttons, variables,
            rawMeta: t,
          },
        })
        totalSynced++
      }

      nextUrl = data.paging?.next || null
    }

    await prisma.channelConfig.update({
      where: { id: config.id },
      data: { lastTemplateSyncAt: new Date() },
    })

    return { success: true, synced: totalSynced }
  } catch (err: any) {
    return { success: false, synced: totalSynced, error: err?.message || "network error" }
  }
}

function extractTemplateParts(components: any[]): {
  variables: string[]
  bodyText: string | null
  headerType: string | null
  headerText: string | null
  footerText: string | null
  buttons: any
} {
  let bodyText: string | null = null
  let headerType: string | null = null
  let headerText: string | null = null
  let footerText: string | null = null
  let buttons: any = null
  const variables = new Set<string>()

  for (const c of components) {
    if (c.type === "BODY") {
      bodyText = c.text || null
      // Prefer named parameters when Meta returns them.
      const named: string[] = c.example?.body_text_named_params?.map((p: any) => p.param_name) || []
      if (named.length) {
        for (const n of named) variables.add(n)
      } else if (bodyText) {
        const matches = bodyText.match(/\{\{\d+\}\}/g) || []
        for (const m of matches) variables.add(m.replace(/[{}]/g, ""))
      }
    } else if (c.type === "HEADER") {
      headerType = c.format || null
      headerText = c.text || null
    } else if (c.type === "FOOTER") {
      footerText = c.text || null
    } else if (c.type === "BUTTONS") {
      buttons = c.buttons || c
    }
  }

  return {
    variables: Array.from(variables),
    bodyText,
    headerType,
    headerText,
    footerText,
    buttons,
  }
}

// ─── Validate credentials ────────────────────────────────────────────
export async function validateWhatsAppCredentials(
  organizationId: string,
): Promise<{ ok: boolean; verifiedName?: string; displayPhoneNumber?: string; error?: string }> {
  const config = await resolveWhatsAppConfig(organizationId)
  if (!config) return { ok: false, error: "WhatsApp not configured" }

  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${config.phoneNumberId}?fields=verified_name,display_phone_number`,
      { headers: { Authorization: `Bearer ${config.accessToken}` } },
    )
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` }

    await prisma.channelConfig.update({
      where: { id: config.id },
      data: { lastValidatedAt: new Date() },
    })

    return {
      ok: true,
      verifiedName: data.verified_name,
      displayPhoneNumber: data.display_phone_number,
    }
  } catch (err: any) {
    return { ok: false, error: err?.message || "network error" }
  }
}

// ─── internal: message log helper ────────────────────────────────────
async function logMessage(
  organizationId: string,
  config: WhatsAppConfig,
  to: string,
  body: string,
  status: "delivered" | "failed",
  contactId: string | undefined,
  extraMeta: Record<string, any>,
) {
  try {
    await prisma.channelMessage.create({
      data: {
        organizationId,
        channelConfigId: config.id,
        direction: "outbound",
        channelType: "whatsapp",
        from: config.phoneNumberId,
        to,
        body,
        status,
        externalId: extraMeta.waMessageId,
        metadata: { channel: "whatsapp", ...extraMeta },
        contactId,
      },
    })
  } catch { /* logging failure must not break the send flow */ }
}
