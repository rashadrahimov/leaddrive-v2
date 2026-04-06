import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

const updateRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  ruleType: z.enum(["owner", "role", "team", "all"]).optional(),
  sourceRole: z.string().optional(),
  targetRole: z.string().optional(),
  accessLevel: z.enum(["read", "readwrite"]).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "settings", "admin")
  if (isAuthError(auth)) return auth
  const { id } = await params

  const body = await req.json()
  const parsed = updateRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const rule = await prisma.sharingRule.updateMany({
      where: { id, organizationId: auth.orgId },
      data: parsed.data,
    })
    if (rule.count === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Sharing rule PUT error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "settings", "admin")
  if (isAuthError(auth)) return auth
  const { id } = await params

  try {
    const result = await prisma.sharingRule.deleteMany({
      where: { id, organizationId: auth.orgId },
    })
    if (result.count === 0) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Sharing rule DELETE error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
