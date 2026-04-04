import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req, "settings", "read")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, department: true, isActive: true,
        totpEnabled: true, require2fa: true, lastLogin: true, loginCount: true,
        skills: true, maxTickets: true, isAvailable: true, createdAt: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (e) {
    console.error("Users GET error:", e)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
