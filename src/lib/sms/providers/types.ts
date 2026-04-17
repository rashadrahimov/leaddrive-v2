/**
 * SMS provider abstraction.
 *
 * Each provider implements this interface. The registry in `src/lib/sms.ts`
 * picks one based on the org's ChannelConfig.settings.smsProvider or the
 * SMS_PROVIDER env var (default: "twilio").
 *
 * To add a new provider:
 *   1. Create src/lib/sms/providers/<name>.ts implementing SmsProvider
 *   2. Register it in PROVIDERS inside src/lib/sms.ts
 *   3. Document required env vars / org settings shape
 */

export interface SmsSendParams {
  to: string
  from?: string
  message: string
}

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface SmsProviderSettings {
  [key: string]: unknown
}

export interface SmsProvider {
  readonly name: string

  /** Whether this provider has enough config to send. Used for preflight checks. */
  isConfigured(settings: SmsProviderSettings): boolean

  /** Actually send the SMS. Returns success=false with error string on failure. */
  send(settings: SmsProviderSettings, params: SmsSendParams): Promise<SmsSendResult>
}
