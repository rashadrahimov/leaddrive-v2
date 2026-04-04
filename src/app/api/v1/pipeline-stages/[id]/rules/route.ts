import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// GET — list validation rules for a stage
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const organizationId = await getOrgId(req)
  if (!organizationId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const rules = await prisma.stageValidationRule.findMany({
    where: { pipelineStageId: id, organizationId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ success: true, data: rules })
}

// POST — create a validation rule
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const organizationId = await getOrgId(req)
  if (!organizationId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { fieldName, ruleType, ruleValue, errorMessage } = body

  if (!fieldName || !ruleType || !errorMessage) {
    return NextResponse.json({ success: false, error: "fieldName, ruleType and errorMessage are required" }, { status: 400 })
  }

  const rule = await prisma.stageValidationRule.create({
    data: {
      organizationId,
      pipelineStageId: id,
      fieldName,
      ruleType,
      ruleValue: ruleValue || null,
      errorMessage,
    },
  })

  return NextResponse.json({ success: true, data: rule })
}

// DELETE — delete a validation rule
export async function DELETE(req: NextRequest) {
  const organizationId = await getOrgId(req)
  if (!organizationId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { ruleId } = body

  if (!ruleId) {
    return NextResponse.json({ success: false, error: "ruleId is required" }, { status: 400 })
  }

  await prisma.stageValidationRule.delete({
    where: { id: ruleId },
  })

  return NextResponse.json({ success: true })
}
