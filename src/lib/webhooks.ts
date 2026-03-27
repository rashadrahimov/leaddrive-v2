import { createHmac } from "crypto"
import { isPrivateUrl } from "@/lib/url-validation"

export type WebhookEvent =
  | "contact.created"
  | "contact.updated"
  | "deal.created"
  | "deal.updated"
  | "lead.created"
  | "lead.updated"

interface WebhookPayload {
  event: WebhookEvent
  timestamp: number
  organizationId: string
  data: Record<string, unknown>
}

interface RegisteredWebhook {
  id: string
  url: string
  secret: string
  events: WebhookEvent[]
  active: boolean
}

// In-memory webhook store (would be database in production)
const webhookStore = new Map<string, RegisteredWebhook[]>()

export async function dispatchWebhook(
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = webhookStore.get(orgId) ?? []
  const webhookPayload: WebhookPayload = {
    event,
    timestamp: Date.now(),
    organizationId: orgId,
    data: payload,
  }

  // Fire-and-forget async dispatch
  setImmediate(() => {
    webhooks.forEach(async (webhook) => {
      if (!webhook.active || !webhook.events.includes(event)) return

      try {
        // SSRF protection: block requests to private/internal IPs
        if (isPrivateUrl(webhook.url)) {
          console.error(`Webhook ${webhook.id}: blocked SSRF attempt to private URL`)
          return
        }

        const signature = createHmac("sha256", webhook.secret)
          .update(JSON.stringify(webhookPayload))
          .digest("hex")

        await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
          },
          body: JSON.stringify(webhookPayload),
        })
      } catch (error) {
        console.error(`Webhook delivery failed for ${webhook.id}:`, error)
      }
    })
  })
}

export function registerWebhook(
  orgId: string,
  webhook: RegisteredWebhook
): void {
  const webhooks = webhookStore.get(orgId) ?? []
  webhooks.push(webhook)
  webhookStore.set(orgId, webhooks)
}

export function getWebhooks(orgId: string): RegisteredWebhook[] {
  return webhookStore.get(orgId) ?? []
}
