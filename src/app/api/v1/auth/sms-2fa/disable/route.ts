import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"

/**
 * POST /api/v1/auth/sms-2fa/disable
 *
 * Turns off the SMS 2FA flag. Keeps verifiedPhone on the record so re-enabling
 * doesn't require re-verifying the number (but clears it on explicit phone
 * change — that's a separate flow).
 *
 * For a sensitive action like disabling 2FA, you'd typically gate this behind
 * a fresh SMS code re-verify. Out of Phase 1 scope — TODO marked in docs.
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.user.update({
    where: { id: session.userId },
    data: { smsAuthEnabled: false },
  })

  return NextResponse.json({ success: true })
}
