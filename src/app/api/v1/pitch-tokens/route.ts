import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import crypto from "crypto"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tokens = await prisma.pitchToken.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: tokens })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { guestName } = body
  if (!guestName) return NextResponse.json({ error: "guestName required" }, { status: 400 })

  const token = crypto.randomUUID()

  const record = await prisma.pitchToken.create({
    data: {
      organizationId: orgId,
      token,
      guestName,
    },
  })

  const baseUrl = process.env.MARKETING_URL || "https://leaddrivecrm.org"
  const url = `${baseUrl}/pitch/${token}`

  return NextResponse.json({ success: true, data: { ...record, url } }, { status: 201 })
}
