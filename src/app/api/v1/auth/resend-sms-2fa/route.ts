import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { sendOtp } from "@/lib/sms"

/**
 * POST /api/v1/auth/resend-sms-2fa
 *
 * Lets the user request a fresh SMS code on the verify page (e.g. if the first
 * one didn't arrive). Rate-limited per-phone and per-IP by sendOtp itself.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { smsAuthEnabled: true, verifiedPhone: true, organizationId: true },
  })
  if (!user || !user.smsAuthEnabled || !user.verifiedPhone) {
    return NextResponse.json({ error: "SMS 2FA not enabled" }, { status: 400 })
  }

  const result = await sendOtp({
    phone: user.verifiedPhone,
    purpose: "2fa",
    organizationId: user.organizationId,
    userId,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send code" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
