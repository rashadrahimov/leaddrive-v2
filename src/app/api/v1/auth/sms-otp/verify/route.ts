import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyOtp } from "@/lib/sms"

const schema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().regex(/^\d{4,8}$/, "Code must be 4-8 digits"),
  purpose: z.enum(["login", "2fa", "verification", "sensitive_action"]),
})

/**
 * POST /api/v1/auth/sms-otp/verify
 * Verifies a one-time code for the given phone+purpose.
 * Returns 200 on success, 400 on invalid, 429 after too many attempts.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const normalizedPhone = parsed.data.phone.replace(/[\s\-()]/g, "")
  const result = await verifyOtp(normalizedPhone, parsed.data.code, parsed.data.purpose)

  if (!result.success) {
    const status = result.error === "Too many attempts" ? 429 : 400
    return NextResponse.json({ error: result.error || "Invalid code" }, { status })
  }

  return NextResponse.json({ success: true })
}
