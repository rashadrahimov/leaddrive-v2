import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const ctx = await getOrgId(req)
  if (!ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const accounts = await prisma.account.findMany({
    where: { userId: ctx.userId },
    select: {
      id: true,
      provider: true,
      type: true,
      providerAccountId: true,
    },
  })

  return NextResponse.json({ success: true, data: accounts })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getOrgId(req)
  if (!ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accountId } = await req.json()

  // Ensure user has at least one other way to log in (password or another OAuth)
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { passwordHash: true },
  })

  const accountCount = await prisma.account.count({
    where: { userId: ctx.userId },
  })

  const hasPassword = user?.passwordHash && user.passwordHash.length > 0
  if (!hasPassword && accountCount <= 1) {
    return NextResponse.json(
      { error: "Cannot unlink the only login method. Set a password first." },
      { status: 400 }
    )
  }

  // Verify ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: ctx.userId },
  })
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 })
  }

  await prisma.account.delete({ where: { id: accountId } })

  return NextResponse.json({ success: true })
}
