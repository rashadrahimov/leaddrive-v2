import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

const createRuleSchema = z.object({
  entityType: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  ruleType: z.enum(["owner", "role", "team", "all"]),
  sourceRole: z.string().optional(),
  targetRole: z.string().optional(),
  accessLevel: z.enum(["read", "readwrite"]),
  isActive: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, "settings", "read")
  if (isAuthError(auth)) return auth

  try {
    const rules = await prisma.sharingRule.findMany({
      where: { organizationId: auth.orgId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ success: true, data: rules })
  } catch (e) {
    console.error("Sharing rules GET error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, "settings", "admin")
  if (isAuthError(auth)) return auth

  const body = await req.json()
  const parsed = createRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const rule = await prisma.sharingRule.create({
      data: {
        organizationId: auth.orgId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: rule })
  } catch (e) {
    console.error("Sharing rules POST error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
