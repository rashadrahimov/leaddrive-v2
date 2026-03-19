import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TOTP, generateSecret, generateURI } from "otplib"
import QRCode from "qrcode"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id as string

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (user.totpEnabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 })
  }

  // Generate secret
  const secret = generateSecret()
  const otpauth = generateURI("totp", secret, user.email, "LeadDrive CRM")

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(otpauth)

  // Store secret temporarily (not enabled yet until verified)
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret },
  })

  return NextResponse.json({
    success: true,
    data: {
      secret,
      qrCode,
      otpauth,
    },
  })
}
