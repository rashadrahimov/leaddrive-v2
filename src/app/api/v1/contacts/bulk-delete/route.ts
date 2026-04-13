import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { z } from "zod"

const schema = z.object({
  ids: z.array(z.string()).min(1, "Select at least one contact"),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { ids } = schema.parse(body)

    const result = await prisma.contact.deleteMany({
      where: {
        id: { in: ids },
        organizationId: orgId,
      },
    })

    return NextResponse.json({
      success: true,
      data: { deleted: result.count },
    })
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json({ error: e.issues?.[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
