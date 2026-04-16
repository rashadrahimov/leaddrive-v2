import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { sendOtp } from "@/lib/sms"
import { getOrgId } from "@/lib/api-auth"

const schema = z.object({
  phone: z.string().min(7).max(20).regex(/^\+?[\d\s-()]+$/, "Invalid phone"),
  purpose: z.enum(["login", "2fa", "verification", "sensitive_action"]),
})

/**
 * POST /api/v1/auth/sms-otp/send
 * Sends a one-time code to the given phone number.
 * orgId is optional — pre-auth flows (signup) may omit it.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const orgId = await getOrgId(req).catch(() => null)
  const normalizedPhone = parsed.data.phone.replace(/[\s\-()]/g, "")

  const result = await sendOtp({
    phone: normalizedPhone,
    purpose: parsed.data.purpose,
    organizationId: orgId || undefined,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send code" }, { status: 500 })
  }

  // In development we echo the code to aid local testing. Never in production.
  return NextResponse.json({
    success: true,
    ...(result.debugCode ? { debugCode: result.debugCode } : {}),
  })
}
