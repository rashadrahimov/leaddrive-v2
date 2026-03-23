import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import * as OTPAuth from "otplib"
import QRCode from "qrcode"
import crypto from "crypto"

const { authenticator } = OTPAuth

// GET — get 2FA status
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true, email: true },
  })

  return NextResponse.json({
    success: true,
    data: { enabled: user?.totpEnabled || false },
  })
}

// POST — setup or verify 2FA
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as any).id
  const body = await req.json()
  const { action, code } = body

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, totpSecret: true, totpEnabled: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // SETUP — generate secret + QR code
  if (action === "setup") {
    const secret = authenticator.generateSecret()

    // Save secret (not yet enabled)
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: false },
    })

    const otpauth = authenticator.keyuri(
      user.email,
      "LeadDrive CRM",
      secret
    )

    const qrDataUrl = await QRCode.toDataURL(otpauth)

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex")
    )

    return NextResponse.json({
      success: true,
      data: { secret, qrCode: qrDataUrl, backupCodes },
    })
  }

  // VERIFY — enable 2FA after verifying code
  if (action === "verify") {
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })
    if (!user.totpSecret) return NextResponse.json({ error: "Setup 2FA first" }, { status: 400 })

    const isValid = authenticator.verify({ token: code, secret: user.totpSecret })
    if (!isValid) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    })

    return NextResponse.json({
      success: true,
      data: { message: "2FA enabled successfully" },
    })
  }

  // DISABLE — turn off 2FA
  if (action === "disable") {
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })
    if (!user.totpSecret || !user.totpEnabled) {
      return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 })
    }

    const isValid = authenticator.verify({ token: code, secret: user.totpSecret })
    if (!isValid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    })

    return NextResponse.json({
      success: true,
      data: { message: "2FA disabled successfully" },
    })
  }

  // VALIDATE — check code during login
  if (action === "validate") {
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })
    if (!user.totpSecret || !user.totpEnabled) {
      return NextResponse.json({ success: true, data: { valid: true } })
    }

    const isValid = authenticator.verify({ token: code, secret: user.totpSecret })
    return NextResponse.json({
      success: true,
      data: { valid: isValid },
    })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
