import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Unset categoryId on articles that reference this category
  await prisma.kbArticle.updateMany({
    where: { organizationId: orgId, categoryId: id },
    data: { categoryId: null },
  })

  await prisma.kbCategory.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
