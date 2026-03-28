import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const result = await prisma.invoice.updateMany({
      where: {
        organizationId: orgId,
        status: { in: ["sent", "viewed", "partially_paid"] },
        dueDate: { lt: new Date() },
      },
      data: { status: "overdue" },
    })

    return NextResponse.json({ success: true, data: { updated: result.count } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
