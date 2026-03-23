import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const users = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, department: true, isActive: true,
        totpEnabled: true, require2fa: true, lastLogin: true, loginCount: true, createdAt: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: users })
  } catch (e) {
    console.error("Users GET error:", e)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
