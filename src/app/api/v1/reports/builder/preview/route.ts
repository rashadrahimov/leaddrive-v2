import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { executeReport } from "@/lib/report-engine"

const previewSchema = z.object({
  entityType: z.string().min(1).max(100),
  columns: z.any(),
  filters: z.any().default([]),
  groupBy: z.string().max(100).optional().nullable(),
  sortBy: z.string().max(100).optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().int().min(1).max(10000).default(100),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let config
  try {
    config = previewSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    const result = await executeReport(orgId, config)
    return NextResponse.json({ success: true, data: result })
  } catch (e: any) {
    console.error("Report preview error:", e)
    return NextResponse.json({ error: e.message || "Report execution failed" }, { status: 500 })
  }
}
