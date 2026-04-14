import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { checkAiBudget } from "@/lib/ai/budget"

/**
 * GET /api/v1/settings/ai-budget — current budget usage
 * PATCH /api/v1/settings/ai-budget — update daily limit
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const budget = await checkAiBudget(orgId)
  return NextResponse.json({ data: budget })
}

export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { limit } = body as { limit: number }

  if (typeof limit !== "number" || limit <= 0 || limit > 100) {
    return NextResponse.json({ error: "Limit must be between 0.5 and 100" }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { settings: true },
  })

  const settings = (org?.settings as Record<string, any>) || {}
  settings.aiDailyBudgetUsd = limit

  await prisma.organization.update({
    where: { id: orgId },
    data: { settings },
  })

  const budget = await checkAiBudget(orgId)
  return NextResponse.json({ data: budget })
}
