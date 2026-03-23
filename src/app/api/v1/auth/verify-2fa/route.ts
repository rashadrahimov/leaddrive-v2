import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { verifySync } from "otplib"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const { code } = body

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Code required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totpSecret: true, totpEnabled: true, backupCodes: true },
  })

  if (!user || !user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA not enabled" }, { status: 400 })
  }

  // Try TOTP code first (6 digits)
  const cleanCode = code.replace(/[\s-]/g, "")

  if (cleanCode.length === 6) {
    const isValid = verifySync({ token: cleanCode, secret: user.totpSecret }).valid
    if (isValid) {
      return NextResponse.json({ success: true, data: { verified: true } })
    }
  }

  // Try backup code (8 hex chars)
  if (cleanCode.length === 8) {
    const backupCodes = (user.backupCodes as string[]) || []
    const codeIndex = backupCodes.findIndex(
      (bc: string) => bc.replace(/-/g, "").toLowerCase() === cleanCode.toLowerCase()
    )
    if (codeIndex !== -1) {
      // Remove used backup code
      const updatedCodes = [...backupCodes]
      updatedCodes.splice(codeIndex, 1)
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedCodes },
      })
      return NextResponse.json({ success: true, data: { verified: true, backupCodeUsed: true } })
    }
  }

  return NextResponse.json({ error: "Invalid code" }, { status: 400 })
}
