import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// GET — list guardrails
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const guardrails = await prisma.aiGuardrail.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: { guardrails } })
}

// POST — create guardrail
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { ruleName, ruleType, description, promptInjection } = body

  if (!ruleName) return NextResponse.json({ error: "Rule name is required" }, { status: 400 })

  const guardrail = await prisma.aiGuardrail.create({
    data: {
      organizationId: orgId,
      ruleName,
      ruleType: ruleType || "restriction",
      description: description || "",
      promptInjection: promptInjection || "",
    },
  })

  return NextResponse.json({ success: true, data: guardrail })
}

// DELETE — delete guardrail
export async function DELETE(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  await prisma.aiGuardrail.deleteMany({
    where: { id, organizationId: orgId },
  })

  return NextResponse.json({ success: true })
}
