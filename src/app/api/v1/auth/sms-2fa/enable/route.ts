import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"
import { verifyOtp } from "@/lib/sms"

const schema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().regex(/^\d{4,8}$/, "Code must be 4-8 digits"),
})

/**
 * POST /api/v1/auth/sms-2fa/enable
 *
 * Two-step activation: the UI first calls /api/v1/auth/sms-otp/send with
 * purpose="2fa", the user types the code, then we land here to verify
 * and flip the flag.
 *
 * On success: user.smsAuthEnabled=true and user.verifiedPhone=<normalized phone>.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const normalizedPhone = parsed.data.phone.replace(/[\s\-()]/g, "")
  const ok = await verifyOtp(normalizedPhone, parsed.data.code, "2fa", session.userId)
  if (!ok.success) {
    const status = ok.error === "Too many attempts" ? 429 : 400
    return NextResponse.json({ error: ok.error || "Invalid code" }, { status })
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { smsAuthEnabled: true, verifiedPhone: normalizedPhone },
  })

  return NextResponse.json({ success: true })
}
