import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  await prisma.pitchToken.updateMany({
    where: { token, used: false },
    data: { used: true },
  })

  return NextResponse.json({ success: true })
}
