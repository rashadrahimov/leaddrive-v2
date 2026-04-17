/**
 * SMS utilities: generic sending + OTP generation/verification.
 *
 * Delivery is pluggable via the provider registry in src/lib/sms/providers/.
 * Provider selection order:
 *   1. ChannelConfig(voip).settings.smsProvider (per-org)
 *   2. SMS_PROVIDER env var (default: "twilio")
 *
 * OTP codes are single-use, time-limited (10 min), and stored hashed via bcrypt.
 */

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { twilioProvider } from "@/lib/sms/providers/twilio"
import { vonageProvider } from "@/lib/sms/providers/vonage"
import type { SmsProvider, SmsProviderSettings } from "@/lib/sms/providers/types"

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const OTP_LENGTH = 6
const MAX_VERIFY_ATTEMPTS = 5

const PROVIDERS: Record<string, SmsProvider> = {
  twilio: twilioProvider,
  vonage: vonageProvider,
}

async function resolveProvider(organizationId?: string): Promise<{ provider: SmsProvider; settings: SmsProviderSettings }> {
  let settings: SmsProviderSettings = {}
  let providerName = process.env.SMS_PROVIDER || "twilio"

  if (organizationId) {
    const cfg = await prisma.channelConfig.findFirst({
      where: { organizationId, channelType: "voip", isActive: true },
    })
    if (cfg?.settings) {
      settings = cfg.settings as SmsProviderSettings
      if (typeof settings.smsProvider === "string") providerName = settings.smsProvider
    }
  }

  const provider = PROVIDERS[providerName] || PROVIDERS.twilio
  return { provider, settings }
}

export interface SendSmsOptions {
  to: string
  message: string
  organizationId?: string
}

export interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

/** Preflight check: is an SMS provider configured for this org (or env fallback)? */
export async function isSmsConfigured(organizationId?: string): Promise<boolean> {
  const { provider, settings } = await resolveProvider(organizationId)
  return provider.isConfigured(settings)
}

/** Send an SMS via the resolved provider. */
export async function sendSms(opts: SendSmsOptions): Promise<SmsResult> {
  const { provider, settings } = await resolveProvider(opts.organizationId)
  if (!provider.isConfigured(settings)) {
    return { success: false, error: "SMS provider not configured" }
  }
  return provider.send(settings, { to: opts.to, message: opts.message })
}

function generateNumericCode(length = OTP_LENGTH): string {
  let code = ""
  for (let i = 0; i < length; i++) code += Math.floor(Math.random() * 10).toString()
  return code
}

export interface SendOtpOptions {
  phone: string
  purpose: "login" | "2fa" | "verification" | "sensitive_action"
  organizationId?: string
  /** Bind the code to a specific user — required for 2fa/sensitive_action flows. */
  userId?: string
  /** Override the default SMS message. `{{code}}` will be replaced. */
  messageTemplate?: string
}

export interface SendOtpResult {
  success: boolean
  error?: string
  /** Only returned in dev/test mode; never in prod. */
  debugCode?: string
}

/**
 * Generate a one-time code, store its hash, and send via SMS.
 * Invalidates any prior unused codes for the same phone+purpose.
 */
export async function sendOtp(opts: SendOtpOptions): Promise<SendOtpResult> {
  const { phone, purpose, organizationId, userId, messageTemplate } = opts
  const code = generateNumericCode()
  const codeHash = await bcrypt.hash(code, 8)

  // Invalidate prior unused codes. Scope by userId when available so one user's
  // reissue doesn't wipe another user's pending code that happens to share a phone.
  await prisma.otpCode.updateMany({
    where: {
      phone,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
      ...(userId ? { userId } : {}),
    },
    data: { usedAt: new Date() },
  })

  await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash,
      organizationId: organizationId || null,
      userId: userId || null,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  })

  const message = (messageTemplate || "Your LeadDrive verification code is {{code}}. Valid for 10 minutes.")
    .replace("{{code}}", code)

  const smsResult = await sendSms({ to: phone, message, organizationId })

  // debugCode is only exposed when BOTH:
  //   1. NODE_ENV !== "production"
  //   2. OTP_EXPOSE_DEBUG_CODE="1" is explicitly set in env
  // Belt-and-braces: if someone boots prod with NODE_ENV=development by mistake,
  // they'd still need to flip the explicit opt-in to leak codes.
  const debugCode = (process.env.NODE_ENV !== "production" && process.env.OTP_EXPOSE_DEBUG_CODE === "1")
    ? code
    : undefined

  if (!smsResult.success) {
    return { success: false, error: smsResult.error, debugCode }
  }
  return { success: true, debugCode }
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
}

/**
 * Check a submitted code against the latest unused OTP for the phone+purpose.
 * When `userId` is provided, the lookup is also scoped to that user so a code
 * issued for user A cannot be verified as user B even if they share a phone.
 *
 * Single-attempt window with a per-code attempt counter to slow brute force.
 */
export async function verifyOtp(
  phone: string,
  code: string,
  purpose: string,
  userId?: string
): Promise<VerifyOtpResult> {
  if (!/^\d+$/.test(code)) return { success: false, error: "Invalid code format" }

  const record = await prisma.otpCode.findFirst({
    where: {
      phone,
      purpose,
      usedAt: null,
      expiresAt: { gt: new Date() },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  if (!record) return { success: false, error: "Code expired or not found" }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    // Lock out further attempts on this record
    await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } })
    return { success: false, error: "Too many attempts" }
  }

  const match = await bcrypt.compare(code, record.codeHash)

  if (!match) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return { success: false, error: "Invalid code" }
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })
  return { success: true }
}
