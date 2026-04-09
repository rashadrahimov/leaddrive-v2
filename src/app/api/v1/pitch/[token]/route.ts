import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const record = await prisma.pitchToken.findUnique({ where: { token } })

  if (!record) {
    return NextResponse.json({ valid: false, reason: "not_found" })
  }

  if (record.used) {
    return NextResponse.json({ valid: false, reason: "used" })
  }

  // Mark as viewed (but not burned yet)
  if (!record.viewedAt) {
    await prisma.pitchToken.update({
      where: { id: record.id },
      data: { viewedAt: new Date() },
    })
  }

  return NextResponse.json({ valid: true, guestName: record.guestName })
}
