import { createHmac } from "crypto"
import { prisma } from "@/lib/prisma"
import { isPrivateUrl } from "@/lib/url-validation"

export type WebhookEvent =
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  | "deal.created"
  | "deal.updated"
  | "deal.stage_changed"
  | "deal.won"
  | "deal.lost"
  | "lead.created"
  | "lead.updated"
  | "lead.converted"
  | "ticket.created"
  | "ticket.updated"
  | "ticket.resolved"
  | "task.created"
  | "task.completed"
  | "company.created"
  | "company.updated"
  | "campaign.sent"

interface WebhookPayload {
  event: string
  timestamp: string
  organizationId: string
  data: Record<string, unknown>
}

export async function fireWebhooks(
  orgId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
    })

    const matching = webhooks.filter(wh => wh.events.includes(event))
    if (matching.length === 0) return

    const webhookPayload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      organizationId: orgId,
      data: payload,
    }

    // Fire-and-forget dispatch
    for (const webhook of matching) {
      dispatchSingleWebhook(webhook.url, webhook.secret, webhookPayload).catch(err => {
        console.error(`Webhook delivery failed for ${webhook.id}:`, err)
      })
    }
  } catch (error) {
    console.error("[Webhooks] Error loading webhooks:", error)
  }
}

async function dispatchSingleWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<void> {
  // SSRF protection
  if (isPrivateUrl(url)) {
    console.error(`[Webhooks] Blocked SSRF attempt to private URL: ${url}`)
    return
  }

  const body = JSON.stringify(payload)
  const signature = createHmac("sha256", secret).update(body).digest("hex")

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Signature": signature,
      "X-Webhook-Event": payload.event,
    },
    body,
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    console.error(`[Webhooks] ${url} responded with ${response.status}`)
  }
}
