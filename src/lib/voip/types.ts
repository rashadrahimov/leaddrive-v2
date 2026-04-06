// LeadDrive CRM — VoIP Provider Abstraction Types

export interface InitiateCallParams {
  toNumber: string
  fromNumber: string
  callbackUrl?: string   // status callback URL
  twimlUrl?: string      // TwiML instruction URL (Twilio-specific, ignored by others)
  record?: boolean
}

export interface InitiateCallResult {
  success: boolean
  callSid?: string       // provider-specific call identifier
  error?: string
}

export interface WebhookData {
  callSid: string
  status: string         // initiated | ringing | in-progress | completed | busy | no-answer | failed
  duration?: number
  recordingUrl?: string
  from?: string
  to?: string
}

export interface TestConnectionResult {
  success: boolean
  message: string
}

/**
 * Unified VoIP provider interface.
 * Every adapter (Twilio, 3CX, Asterisk, Custom SIP) implements this.
 */
export interface VoipProvider {
  getProviderName(): string
  initiateCall(params: InitiateCallParams): Promise<InitiateCallResult>
  endCall(callSid: string): Promise<{ success: boolean; error?: string }>
  testConnection(): Promise<TestConnectionResult>
  parseWebhook(body: Record<string, unknown>): WebhookData | null
}

// --- Settings discriminated union per provider ---

export interface TwilioSettings {
  provider: "twilio"
  accountSid: string
  authToken: string
  twilioNumber: string
  recordCalls?: boolean
}

export interface ThreeCxSettings {
  provider: "threecx"
  serverUrl: string     // e.g. https://mycompany.3cx.eu
  extension: string     // e.g. "101"
  apiKey: string
  recordCalls?: boolean
}

export interface AsteriskSettings {
  provider: "asterisk"
  ariHost: string       // e.g. "192.168.1.10"
  ariPort: number       // default 8088
  username: string
  password: string
  context: string       // dialplan context, e.g. "from-internal"
  callerExtension: string
  recordCalls?: boolean
}

export interface CustomSipSettings {
  provider: "custom-sip"
  sipServer: string
  sipPort: number       // default 5060
  sipDomain: string
  transport: "udp" | "tcp" | "tls" | "wss"
  username: string
  secret: string
  recordCalls?: boolean
}

export type VoipSettings = TwilioSettings | ThreeCxSettings | AsteriskSettings | CustomSipSettings
