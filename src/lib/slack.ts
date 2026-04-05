export interface SlackMessage {
  text: string
  blocks?: any[]
}

export async function sendSlackNotification(webhookUrl: string, message: SlackMessage): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(10000),
    })
    return response.ok
  } catch (error) {
    console.error("[Slack] Notification failed:", error)
    return false
  }
}

export function formatDealNotification(deal: {
  name: string
  value?: number
  stage?: string
  owner?: string
}): SlackMessage {
  return {
    text: `New Deal: ${deal.name}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*New Deal:* ${deal.name}`,
            deal.value != null ? `*Value:* $${deal.value.toLocaleString()}` : null,
            deal.stage ? `*Stage:* ${deal.stage}` : null,
            deal.owner ? `*Owner:* ${deal.owner}` : null,
          ].filter(Boolean).join("\n"),
        },
      },
    ],
  }
}

export function formatTicketNotification(ticket: {
  ticketNumber?: string
  subject: string
  priority?: string
  status?: string
}): SlackMessage {
  return {
    text: `Ticket ${ticket.ticketNumber || ""}: ${ticket.subject}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `*Ticket ${ticket.ticketNumber || ""}:* ${ticket.subject}`,
            ticket.priority ? `*Priority:* ${ticket.priority}` : null,
            ticket.status ? `*Status:* ${ticket.status}` : null,
          ].filter(Boolean).join("\n"),
        },
      },
    ],
  }
}

export function formatGenericNotification(entityType: string, action: string, data: Record<string, any>): SlackMessage {
  return {
    text: `[${entityType}] ${action}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*[${entityType}]* ${action}\n${Object.entries(data).slice(0, 5).map(([k, v]) => `*${k}:* ${v}`).join("\n")}`,
        },
      },
    ],
  }
}
