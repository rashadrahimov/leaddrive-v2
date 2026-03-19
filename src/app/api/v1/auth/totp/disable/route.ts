import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { password } = await req.json()
  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 })
  }

  const userId = session.user.id as string
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!user.totpEnabled) {
    return NextResponse.json({ error: "2FA is not enabled" }, { status: 400 })
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 })
  }

  // Disable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      totpEnabled: false,
      totpSecret: null,
      backupCodes: "[]",
    },
  })

  return NextResponse.json({ success: true })
}
