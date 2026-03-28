import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
]

// Extension whitelist — prevents uploading executable or dangerous file types
// even if the MIME type check is bypassed via content-type spoofing.
// Files should be served with Content-Disposition: attachment to prevent inline execution.
const SAFE_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.csv', '.zip', '.rar'])

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const contract = await prisma.contract.findFirst({ where: { id, organizationId: orgId } })
    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const files = await prisma.contractFile.findMany({
      where: { contractId: id, organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ success: true, data: files })
  } catch {
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const contract = await prisma.contract.findFirst({ where: { id, organizationId: orgId } })
    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ext || !SAFE_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: "File extension not allowed" }, { status: 400 })
    }

    // Use only the validated lowercase extension for the stored filename
    const uniqueName = `${crypto.randomBytes(16).toString("hex")}${ext}`

    const uploadDir = path.join(process.cwd(), "public", "uploads", "contracts")
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadDir, uniqueName), buffer)

    const record = await prisma.contractFile.create({
      data: {
        organizationId: orgId,
        contractId: id,
        fileName: uniqueName,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      },
    })

    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
