import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const createConfigSchema = z.object({
  configName: z.string().min(1).max(255),
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().optional(),
  systemPrompt: z.string().optional(),
  toolsEnabled: z.union([z.string(), z.array(z.string())]).optional(),
  kbEnabled: z.boolean().optional(),
  kbMaxArticles: z.number().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
})

function normalizeToolsEnabled(data: any): any {
  if (typeof data.toolsEnabled === "string") {
    data.toolsEnabled = data.toolsEnabled
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
  }
  return data
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const configs = await prisma.aiAgentConfig.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ success: true, data: { configs } })
  } catch {
    return NextResponse.json({ success: true, data: { configs: [] } })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createConfigSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const config = await prisma.aiAgentConfig.create({
      data: {
        organizationId: orgId,
        ...normalizeToolsEnabled(parsed.data),
      },
    })
    return NextResponse.json({ success: true, data: config }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
