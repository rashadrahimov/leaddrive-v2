// LeadDrive CRM — Asterisk ARI (Asterisk REST Interface) Adapter

import type {
  VoipProvider,
  AsteriskSettings,
  InitiateCallParams,
  InitiateCallResult,
  TestConnectionResult,
  WebhookData,
} from "../types"

export class AsteriskProvider implements VoipProvider {
  private baseUrl: string
  private auth: string
  private context: string
  private callerExtension: string

  constructor(settings: AsteriskSettings) {
    const port = settings.ariPort || 8088
    this.baseUrl = `http://${settings.ariHost}:${port}/ari`
    this.auth = Buffer.from(`${settings.username}:${settings.password}`).toString("base64")
    this.context = settings.context || "from-internal"
    this.callerExtension = settings.callerExtension
  }

  getProviderName(): string {
    return "asterisk"
  }

  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResult> {
    try {
      const channelId = `leaddrive-${Date.now()}`
      const url = `${this.baseUrl}/channels?endpoint=SIP/${params.toNumber}&extension=${this.callerExtension}&context=${this.context}&callerId=${params.fromNumber || this.callerExtension}&channelId=${channelId}`

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${this.auth}`,
          "Content-Type": "application/json",
        },
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return {
          success: true,
          callSid: data.id || channelId,
        }
      }

      const err = await res.text().catch(() => "Unknown error")
      return { success: false, error: `Asterisk ARI error (${res.status}): ${err}` }
    } catch (e) {
      return { success: false, error: `Asterisk connection failed: ${(e as Error).message}` }
    }
  }

  async endCall(callSid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/channels/${callSid}`
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Basic ${this.auth}` },
      })

      if (res.ok || res.status === 404) {
        return { success: true }
      }
      return { success: false, error: `Failed to hang up channel (${res.status})` }
    } catch (e) {
      return { success: false, error: `Asterisk connection failed: ${(e as Error).message}` }
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const url = `${this.baseUrl}/asterisk/info`
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${this.auth}` },
      })

      if (res.ok) {
        const info = await res.json().catch(() => ({}))
        const version = info.system?.version || "unknown"
        return { success: true, message: `Asterisk connected (version ${version}).` }
      }
      if (res.status === 401) {
        return { success: false, message: "Invalid Asterisk ARI credentials." }
      }
      return { success: false, message: `Asterisk ARI returned status ${res.status}.` }
    } catch (e) {
      return { success: false, message: `Cannot reach Asterisk ARI: ${(e as Error).message}` }
    }
  }

  parseWebhook(body: Record<string, unknown>): WebhookData | null {
    // ARI Stasis events
    const channel = body.channel as Record<string, unknown> | undefined
    if (!channel) return null

    const id = channel.id as string
    if (!id) return null

    const stateMap: Record<string, string> = {
      Down: "initiated",
      Rsrvd: "initiated",
      Ring: "ringing",
      Up: "in-progress",
      Busy: "busy",
    }

    return {
      callSid: id,
      status: stateMap[(channel.state as string)] || "unknown",
      from: (channel.caller as Record<string, unknown>)?.number as string | undefined,
      to: (channel.dialplan as Record<string, unknown>)?.exten as string | undefined,
    }
  }
}
