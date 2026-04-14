import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

/**
 * AI Shadow Actions API
 * GET — list shadow actions (pending review)
 * PATCH — approve/reject a shadow action
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get("status") || "pending" // pending, approved, rejected
  const featureName = url.searchParams.get("feature") || undefined
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "20"))

  const where: any = { organizationId: orgId }

  if (status === "pending") {
    where.approved = null
  } else if (status === "approved") {
    where.approved = true
  } else if (status === "rejected") {
    where.approved = false
  }

  if (featureName) {
    where.featureName = featureName
  }

  const [actions, total] = await Promise.all([
    prisma.aiShadowAction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.aiShadowAction.count({ where }),
  ])

  return NextResponse.json({
    data: actions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { actionId, decision } = body as { actionId: string; decision: "approve" | "reject" }

  if (!actionId || !["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request: actionId and decision (approve/reject) required" }, { status: 400 })
  }

  const action = await prisma.aiShadowAction.findFirst({
    where: { id: actionId, organizationId: orgId },
  })

  if (!action) {
    return NextResponse.json({ error: "Shadow action not found" }, { status: 404 })
  }

  if (action.approved !== null) {
    return NextResponse.json({ error: "Action already reviewed" }, { status: 409 })
  }

  const updated = await prisma.aiShadowAction.update({
    where: { id: actionId },
    data: {
      approved: decision === "approve",
      reviewedAt: new Date(),
      reviewedBy: orgId, // ideally userId from session
    },
  })

  return NextResponse.json({ data: updated })
}
