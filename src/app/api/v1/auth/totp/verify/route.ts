import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verifySync } from "otplib"
import crypto from "crypto"

function generateBackupCodes(count = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`)
  }
  return codes
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { token } = await req.json()
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }

  const userId = session.user.id as string
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.totpSecret) {
    return NextResponse.json({ error: "TOTP setup not started" }, { status: 400 })
  }

  // Verify the token
  const isValid = verifySync({ token, secret: user.totpSecret }).valid
  if (!isValid) {
    return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 })
  }

  // Generate backup codes
  const backupCodes = generateBackupCodes()

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabled: true,
      backupCodes: JSON.stringify(backupCodes),
    },
  })

  return NextResponse.json({
    success: true,
    data: { backupCodes },
  })
}
