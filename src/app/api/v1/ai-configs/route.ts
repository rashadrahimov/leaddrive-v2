import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const configs = await prisma.aiAgentConfig.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ success: true, data: { configs } })
  } catch {
    return NextResponse.json({ success: true, data: { configs: [] } })
  }
}
