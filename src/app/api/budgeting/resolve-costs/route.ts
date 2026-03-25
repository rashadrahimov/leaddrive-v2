import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { loadAndCompute } from "@/lib/cost-model/db"
import { resolveCostModelKey } from "@/lib/budgeting/cost-model-map"

/**
 * POST /api/budgeting/resolve-costs
 * Body: { keys: string[] }
 * Returns: { data: Record<string, number> }
 *
 * Resolves cost model keys to current values.
 * Used by TemplateSeedButton to pre-fill plannedAmount from cost model.
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { keys } = body as { keys: string[] }

  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: "keys array required" }, { status: 400 })
  }

  const costModel = await loadAndCompute(orgId).catch(() => null)
  if (!costModel) {
    return NextResponse.json({ success: true, data: {} })
  }

  const resolved: Record<string, number> = {}
  for (const key of keys) {
    resolved[key] = resolveCostModelKey(costModel, key)
  }

  return NextResponse.json({ success: true, data: resolved })
}
