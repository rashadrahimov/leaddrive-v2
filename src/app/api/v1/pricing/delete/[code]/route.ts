import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { code } = await params

  const profile = await prisma.pricingProfile.findFirst({
    where: { organizationId: orgId, companyCode: code },
  })
  if (!profile) return NextResponse.json({ error: `Company '${code}' not found` }, { status: 404 })

  await prisma.pricingProfile.delete({ where: { id: profile.id } })
  return NextResponse.json({ success: true, data: { deleted: code } })
}
