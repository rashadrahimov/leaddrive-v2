import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = crypto.randomBytes(32).toString("base64url")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarToken: token },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://v2.leaddrivecrm.org"

  return NextResponse.json({
    success: true,
    data: {
      token,
      feedUrl: `${baseUrl}/api/v1/calendar/feed/${token}`,
    },
  })
}
