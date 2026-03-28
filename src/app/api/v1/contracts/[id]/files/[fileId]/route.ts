import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { unlink } from "fs/promises"
import path from "path"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const authResult = await requireAuth(req, "contracts", "delete")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId
  const { id, fileId } = await params

  try {
    const file = await prisma.contractFile.findFirst({
      where: { id: fileId, contractId: id, organizationId: orgId },
    })
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 })

    // Prevent path traversal — strip directory components and verify resolved path
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads", "contracts")
    const filePath = path.resolve(uploadsDir, path.basename(file.fileName))
    if (!filePath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 })
    }

    // Delete from disk
    await unlink(filePath).catch(() => {})

    // Delete from DB
    await prisma.contractFile.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true, data: { deleted: fileId } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
