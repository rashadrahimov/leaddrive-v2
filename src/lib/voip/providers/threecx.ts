// LeadDrive CRM — 3CX Call Control API Adapter

import type {
  VoipProvider,
  ThreeCxSettings,
  InitiateCallParams,
  InitiateCallResult,
  TestConnectionResult,
  WebhookData,
} from "../types"

export class ThreeCxProvider implements VoipProvider {
  private serverUrl: string
  private extension: string
  private apiKey: string

  constructor(settings: ThreeCxSettings) {
    this.serverUrl = settings.serverUrl.replace(/\/$/, "")
    this.extension = settings.extension
    this.apiKey = settings.apiKey
  }

  getProviderName(): string {
    return "threecx"
  }

  async initiateCall(params: InitiateCallParams): Promise<InitiateCallResult> {
    try {
      const url = `${this.serverUrl}/callcontrol/${this.extension}/makecall`
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-3CX-ApiKey": this.apiKey,
        },
        body: JSON.stringify({
          destination: params.toNumber,
        }),
      })

      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        return {
          success: true,
          callSid: data.callId || data.id || `3cx-${Date.now()}`,
        }
      }

      const err = await res.text().catch(() => "Unknown error")
      return { success: false, error: `3CX API error (${res.status}): ${err}` }
    } catch (e) {
      return { success: false, error: `3CX connection failed: ${(e as Error).message}` }
    }
  }

  async endCall(callSid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.serverUrl}/callcontrol/${this.extension}/drop`
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-3CX-ApiKey": this.apiKey,
        },
        body: JSON.stringify({ callId: callSid }),
      })

      if (res.ok) {
        return { success: true }
      }
      return { success: false, error: `Failed to end call (${res.status})` }
    } catch (e) {
      return { success: false, error: `3CX connection failed: ${(e as Error).message}` }
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      // Query system status or extension list to verify API key
      const url = `${this.serverUrl}/callcontrol/${this.extension}/status`
      const res = await fetch(url, {
        headers: { "X-3CX-ApiKey": this.apiKey },
      })

      if (res.ok) {
        return { success: true, message: "3CX connection verified. Extension is reachable." }
      }
      if (res.status === 401 || res.status === 403) {
        return { success: false, message: "Invalid 3CX API key." }
      }
      return { success: false, message: `3CX returned status ${res.status}.` }
    } catch (e) {
      return { success: false, message: `Cannot reach 3CX server: ${(e as Error).message}` }
    }
  }

  parseWebhook(body: Record<string, unknown>): WebhookData | null {
    // 3CX webhook payloads vary by version; map common fields
    const callId = (body.callId || body.CallId || body.id) as string
    if (!callId) return null

    return {
      callSid: callId,
      status: (body.status || body.Status || "unknown") as string,
      duration: body.duration ? Number(body.duration) : undefined,
      recordingUrl: body.recordingUrl as string | undefined,
      from: body.from as string | undefined,
      to: body.to as string | undefined,
    }
  }
}
