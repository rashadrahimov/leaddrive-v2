import { NextRequest, NextResponse } from "next/server"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB — emails shouldn't carry larger images anyway
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"]
const ALLOWED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"])

// POST /api/v1/email-templates/upload-image
// Upload an image to reference from an email template. Any authenticated user
// with write access to the "campaigns" module can upload — images are scoped
// to the organization and stored under /public/uploads/email-images/<orgId>/.
// Returns a public URL the contentEditable editor can insert as an <img src>.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "campaigns", "write")
  if (isAuthError(auth)) return auth

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Allowed: PNG, JPG, WebP, GIF, SVG" },
        { status: 400 },
      )
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Max 5MB" },
        { status: 400 },
      )
    }
    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { success: false, error: "Invalid file extension" },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const hash = crypto.randomBytes(8).toString("hex")
    const filename = `img-${hash}${ext}`

    // Scope uploads per org so a tenant can never reference another tenant's
    // images by guessing a URL.
    const relDir = path.join("uploads", "email-images", auth.orgId)
    const filename_rel = path.join(relDir, filename)

    // Mirror the pattern used by upload-logo: write to both the project root
    // (survives redeploys via the standalone build traced-files set) and to
    // the standalone's public/ so the file is served immediately.
    const projectRoot = process.env.APP_DIR || path.resolve(process.cwd(), "../..")
    const targets = [
      path.join(projectRoot, "public", relDir),
      path.join(process.cwd(), "public", relDir),
    ]
    for (const dir of targets) {
      try {
        await mkdir(dir, { recursive: true })
        await writeFile(path.join(dir, filename), buffer)
      } catch {
        // Best-effort — one of the two paths may be read-only or may not
        // exist in dev; the other will still serve.
      }
    }

    return NextResponse.json({ success: true, url: `/${filename_rel}` })
  } catch (error: any) {
    console.error("[email-template-upload-image] error:", error)
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 },
    )
  }
}
