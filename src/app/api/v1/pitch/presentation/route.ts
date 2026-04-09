import { NextRequest, NextResponse } from "next/server"
import fs from "fs"

export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer") || ""
  if (!referer.includes("/pitch/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rootPath = "/opt/leaddrive-v2/private-assets/pitch-presentation.html"
  let html = ""
  try { html = fs.readFileSync(rootPath, "utf-8") } catch {}

  if (!html) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
