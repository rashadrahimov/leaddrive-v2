import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"

// GET — list approval comments for a plan
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: planId } = await params

  const comments = await prisma.budgetApprovalComment.findMany({
    where: { planId, organizationId: session.orgId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(comments)
}

// POST — add an approval comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: planId } = await params
  const body = await req.json()
  const { comment, status } = body

  if (!comment) {
    return NextResponse.json({ error: "comment is required" }, { status: 400 })
  }

  // Verify plan exists and belongs to org
  const plan = await prisma.budgetPlan.findFirst({
    where: { id: planId, organizationId: session.orgId },
  })
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 })
  }

  const created = await prisma.budgetApprovalComment.create({
    data: {
      organizationId: session.orgId,
      planId,
      userId: session.userId,
      userName: session.name,
      status: status || "comment",
      comment,
    },
  })

  return NextResponse.json(created, { status: 201 })
}
