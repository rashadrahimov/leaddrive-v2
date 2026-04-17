import type { SmsProvider, SmsProviderSettings, SmsSendParams, SmsSendResult } from "./types"

interface TwilioSettings extends SmsProviderSettings {
  accountSid?: string
  authToken?: string
  twilioNumber?: string
}

/**
 * Twilio SMS provider.
 *
 * Settings shape (per-org, stored in ChannelConfig.settings):
 *   { accountSid, authToken, twilioNumber }
 *
 * Env fallbacks (for pre-auth flows):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
export const twilioProvider: SmsProvider = {
  name: "twilio",

  isConfigured(settings: SmsProviderSettings): boolean {
    const s = settings as TwilioSettings
    const sid = s.accountSid || process.env.TWILIO_ACCOUNT_SID
    const token = s.authToken || process.env.TWILIO_AUTH_TOKEN
    const from = s.twilioNumber || process.env.TWILIO_FROM_NUMBER
    return Boolean(sid && token && from)
  },

  async send(settings: SmsProviderSettings, params: SmsSendParams): Promise<SmsSendResult> {
    const s = settings as TwilioSettings
    const accountSid = s.accountSid || process.env.TWILIO_ACCOUNT_SID
    const authToken = s.authToken || process.env.TWILIO_AUTH_TOKEN
    const fromNumber = params.from || s.twilioNumber || process.env.TWILIO_FROM_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: "Twilio not configured" }
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
      const body = new URLSearchParams({ To: params.to, From: fromNumber, Body: params.message })

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        return { success: false, error: `Twilio ${res.status}: ${errText.slice(0, 200)}` }
      }

      const data = (await res.json().catch(() => ({}))) as { sid?: string }
      return { success: true, messageId: data.sid }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  },
}
