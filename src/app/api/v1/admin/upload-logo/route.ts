import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/superadmin-guard"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"])

// POST /api/v1/admin/upload-logo — Upload tenant logo image
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PNG, JPG, WebP, SVG" },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 2MB" },
        { status: 400 }
      )
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const hash = crypto.randomBytes(8).toString("hex")
    const filename = `logo-${hash}${ext}`

    // Save to project root (not standalone) so files survive redeploys
    const projectRoot = process.env.APP_DIR || path.resolve(process.cwd(), "../..")
    const uploadDir = path.join(projectRoot, "public", "uploads", "logos")
    await mkdir(uploadDir, { recursive: true })

    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, buffer)

    // Also copy to standalone/public so it's served immediately (before next deploy)
    const standaloneDir = path.join(process.cwd(), "public", "uploads", "logos")
    await mkdir(standaloneDir, { recursive: true })
    await writeFile(path.join(standaloneDir, filename), buffer)

    const url = `/uploads/logos/${filename}`

    return NextResponse.json({ success: true, url })
  } catch (error: any) {
    console.error("[UPLOAD-LOGO] Error:", error)
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    )
  }
}
