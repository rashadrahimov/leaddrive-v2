import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { embedAllKbArticles } from "@/lib/ai/embeddings"

/**
 * POST /api/v1/kb/embed-all
 * Backfill embeddings for all published KB articles.
 * Admin-only, run once or after bulk article changes.
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const count = await embedAllKbArticles(orgId)
    return NextResponse.json({ success: true, data: { articlesEmbedded: count } })
  } catch (err: any) {
    console.error("Embed all error:", err)
    return NextResponse.json({ error: err.message || "Embedding failed" }, { status: 500 })
  }
}
