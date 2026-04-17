/**
 * SMS utilities: generic sending + OTP generation/verification.
 *
 * Uses the org's configured VoIP provider (Twilio) for delivery when available,
 * falling back to env-configured credentials for system-wide flows (e.g. signup).
 *
 * OTP codes are single-use, time-limited (10 min), and stored hashed via bcrypt.
 */

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const OTP_LENGTH = 6
const MAX_VERIFY_ATTEMPTS = 5

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

/**
 * Send an SMS via the org's configured Twilio credentials.
 * Falls back to env-level TWILIO_* credentials when no org is provided
 * (used by signup/pre-auth flows).
 */
export async function sendSms(opts: SendSmsOptions): Promise<SmsResult> {
  const { to, message, organizationId } = opts

  let accountSid: string | undefined
  let authToken: string | undefined
  let fromNumber: string | undefined

  if (organizationId) {
    const cfg = await prisma.channelConfig.findFirst({
      where: { organizationId, channelType: "voip", isActive: true },
    })
    const settings = (cfg?.settings as any) || {}
    accountSid = settings.accountSid
    authToken = settings.authToken
    fromNumber = settings.twilioNumber
  }

  // Fallback to env for system-level flows
  if (!accountSid || !authToken || !fromNumber) {
    accountSid = process.env.TWILIO_ACCOUNT_SID
    authToken = process.env.TWILIO_AUTH_TOKEN
    fromNumber = process.env.TWILIO_FROM_NUMBER
  }

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "SMS provider not configured" }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
    const body = new URLSearchParams({ To: to, From: fromNumber, Body: message })

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

    const data = await res.json().catch(() => ({}))
    return { success: true, messageId: data.sid }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
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

  // In dev we expose the code for local testing; never in production.
  const debugCode = process.env.NODE_ENV !== "production" ? code : undefined

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
