import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

// DELETE a single survey response and decrement totalResponses.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; responseId: string }> }) {
  const auth = await requireAuth(req, "campaigns", "delete")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id, responseId } = await params

  const existing = await prisma.surveyResponse.findFirst({
    where: { id: responseId, surveyId: id, organizationId: orgId },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.surveyResponse.delete({ where: { id: responseId } })
  await prisma.survey.update({
    where: { id },
    data: { totalResponses: { decrement: 1 } },
  })
  return NextResponse.json({ success: true })
}
