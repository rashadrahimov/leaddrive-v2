import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  const email = session?.user?.email
  const orgId = session?.user?.organizationId || req.headers.get("x-organization-id")
  if (!email || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findFirst({
    where: { email, organizationId: orgId },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const token = crypto.randomBytes(32).toString("base64url")

  await prisma.user.update({
    where: { id: user.id },
    data: { calendarToken: token },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://app.leaddrivecrm.org"

  return NextResponse.json({
    success: true,
    data: {
      token,
      feedUrl: `${baseUrl}/api/v1/calendar/feed/${token}`,
    },
  })
}
