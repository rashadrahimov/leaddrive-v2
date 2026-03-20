import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { buildContactWhere } from "@/lib/segment-conditions"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const conditions = body.conditions || {}

  try {
    const where = buildContactWhere(orgId, conditions)
    const count = await prisma.contact.count({ where })
    return NextResponse.json({ success: true, data: { count } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
