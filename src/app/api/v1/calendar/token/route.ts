import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  const email = session?.user?.email
  const orgId = session?.user?.organizationId || req.headers.get("x-organization-id")
  if (!email || !orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findFirst({
    where: { email, organizationId: orgId },
    select: { calendarToken: true },
  })

  const baseUrl = process.env.NEXTAUTH_URL || "https://v2.leaddrivecrm.org"

  return NextResponse.json({
    success: true,
    data: {
      token: user?.calendarToken || null,
      feedUrl: user?.calendarToken ? `${baseUrl}/api/v1/calendar/feed/${user.calendarToken}` : null,
    },
  })
}
