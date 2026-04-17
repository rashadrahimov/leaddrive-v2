import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"

/**
 * GET /api/v1/auth/sms-2fa/status
 * Returns the SMS 2FA state for the signed-in user, used by the card UI
 * to decide which state to render (disabled | enabled).
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { smsAuthEnabled: true, verifiedPhone: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Mask phone in the response: "+9945*****838" — enough for the UI to confirm
  // which number is active, but not full disclosure in case the response leaks.
  const maskedPhone = user.verifiedPhone
    ? user.verifiedPhone.slice(0, 5) + "*****" + user.verifiedPhone.slice(-3)
    : null

  return NextResponse.json({
    success: true,
    data: {
      enabled: user.smsAuthEnabled,
      phone: maskedPhone,
    },
  })
}
