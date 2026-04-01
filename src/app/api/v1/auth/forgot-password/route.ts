import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import crypto from "crypto"

function escHtml(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({
    success: true,
    message: "If the email exists, a reset link has been sent.",
  })

  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
  })
  if (!user) return successResponse

  // Generate token
  const resetToken = crypto.randomBytes(32).toString("hex")
  const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://app.leaddrivecrm.org"
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

  await sendEmail({
    to: email,
    organizationId: user.organizationId,
    subject: "Reset your LeadDrive password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>Hi ${escHtml(user.name)},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
        <p style="color: #666; font-size: 14px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">LeadDrive CRM</p>
      </div>
    `,
  })

  return successResponse
}
