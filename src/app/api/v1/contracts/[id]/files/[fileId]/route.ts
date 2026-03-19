import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { unlink } from "fs/promises"
import path from "path"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, fileId } = await params

  try {
    const file = await prisma.contractFile.findFirst({
      where: { id: fileId, contractId: id, organizationId: orgId },
    })
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 })

    // Delete from disk
    const filePath = path.join(process.cwd(), "public", "uploads", "contracts", file.fileName)
    await unlink(filePath).catch(() => {})

    // Delete from DB
    await prisma.contractFile.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true, data: { deleted: fileId } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
