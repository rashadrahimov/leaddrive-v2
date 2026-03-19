import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()
  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExp: { gt: new Date() },
      isActive: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExp: null,
    },
  })

  return NextResponse.json({
    success: true,
    message: "Password has been reset successfully.",
  })
}
